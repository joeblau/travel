"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Clock from "./clock";
import AddLocation from "./add-location";
import Elevation from "./elevation";
import Coordinates from "./coordinates";
import CurrentLocation from "./current-location";

export default function Map() {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
	const [centerLng, setCenterLng] = useState(0);
	const [centerLat, setCenterLat] = useState(20);
	const [zoom, setZoom] = useState(2);

	const loadLocations = useCallback(async () => {
		if (!map.current) return;

		try {
			const response = await fetch("/conquer-earth-locations.geojson");
			const locationsData = await response.json();

			const source = map.current.getSource("locations") as mapboxgl.GeoJSONSource;
			if (source) {
				source.setData(locationsData as GeoJSON.FeatureCollection);
			}
		} catch (error) {
			console.error("Failed to reload locations data:", error);
		}
	}, []);

	const handleUserLocation = useCallback((lng: number, lat: number, shouldFly = true) => {
		if (!map.current) return;

		console.log("Setting user location marker at:", { lng, lat });

		// Remove existing marker if any
		if (userLocationMarker.current) {
			userLocationMarker.current.remove();
		}

		// Create custom marker element for user location
		const el = document.createElement("div");
		el.className = "user-location-marker";
		el.style.width = "20px";
		el.style.height = "20px";
		el.style.borderRadius = "50%";
		el.style.backgroundColor = "#3b82f6";
		el.style.border = "3px solid white";
		el.style.boxShadow = "0 0 10px rgba(59, 130, 246, 0.5)";

		// Add pulsing animation
		el.style.animation = "pulse 2s infinite";

		// Add marker at user's location with center anchor
		userLocationMarker.current = new mapboxgl.Marker({
			element: el,
			anchor: "center"
		})
			.setLngLat([lng, lat])
			.addTo(map.current);

		// Fly to user's location if requested
		if (shouldFly) {
			map.current.flyTo({
				center: [lng, lat],
				zoom: 10,
				duration: 2000,
				essential: true,
			});
		}
	}, []);

	useEffect(() => {
		console.log("Map useEffect running");
		console.log("map.current:", map.current);

		if (map.current) return;

		// Access env var - Next.js inlines this at build time
		const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

		console.log("Mapbox token:", mapboxToken ? "Found" : "Not found");
		console.log("All env vars:", Object.keys(process.env));

		if (!mapboxToken) {
			console.error("Mapbox token is not set. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file");
			console.error("Build-time env:", process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
			return;
		}

		mapboxgl.accessToken = mapboxToken;
		console.log("Mapbox accessToken set successfully");

		if (mapContainer.current) {
			map.current = new mapboxgl.Map({
				container: mapContainer.current,
				style: "mapbox://styles/mapbox/dark-v11",
				center: [0, 20],
				zoom: 2,
				projection: { name: "globe" },
				attributionControl: false,
			});

			map.current.on("style.load", async () => {
				if (map.current) {
					try {
						// Fetch GeoJSON data
						const response = await fetch("/conquer-earth-locations.geojson");
						const locationsData = await response.json();

						// Add GeoJSON source
						map.current.addSource("locations", {
							type: "geojson",
							data: locationsData as GeoJSON.FeatureCollection,
						});

						// Add circle layer for location points
						map.current.addLayer({
							id: "locations-circle",
							type: "circle",
							source: "locations",
							paint: {
								"circle-radius": [
									"interpolate",
									["linear"],
									["zoom"],
									2, 3,
									10, 8
								],
								"circle-color": [
									"match",
									["get", "type"],
									"City", "#3b82f6",
									"Airport", "#8b5cf6",
									"Park", "#10b981",
									"Place", "#f59e0b",
									"#ef4444"
								],
								"circle-opacity": 0.8,
								"circle-stroke-width": 2,
								"circle-stroke-color": "#ffffff",
								"circle-stroke-opacity": 0.5,
							},
						});

						// Create popup
						const popup = new mapboxgl.Popup({
							closeButton: false,
							closeOnClick: false,
						});

						// Show popup on hover
						map.current.on("mouseenter", "locations-circle", (e) => {
							if (!map.current || !e.features || !e.features[0]) return;

							map.current.getCanvas().style.cursor = "pointer";

							const feature = e.features[0];
							const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
							const { title, type, description } = feature.properties || {};

							// Ensure popup appears over the correct location
							while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
								coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
							}

							const descriptionText = description ? `<p class="text-sm text-gray-400 mt-1">${description}</p>` : "";

							popup
								.setLngLat(coordinates)
								.setHTML(
									`<div class="p-2">
										<h3 class="font-semibold text-white">${title}</h3>
										<p class="text-xs text-gray-300">${type}</p>
										${descriptionText}
									</div>`
								)
								.addTo(map.current);
						});

						// Hide popup on mouse leave
						map.current.on("mouseleave", "locations-circle", () => {
							if (!map.current) return;
							map.current.getCanvas().style.cursor = "";
							popup.remove();
						});
					} catch (error) {
						console.error("Failed to load locations data:", error);
					}

					// Automatically get user's location after map is loaded
					if (navigator.geolocation) {
						navigator.geolocation.getCurrentPosition(
							(position) => {
								const { latitude, longitude } = position.coords;
								console.log("Got geolocation:", { latitude, longitude });
								handleUserLocation(longitude, latitude, true);
							},
							(error) => {
								console.log("Geolocation not available or denied:", error.message);
							},
							{
								enableHighAccuracy: true,
								timeout: 5000,
								maximumAge: 0,
							}
						);
					}
				}
			});

			map.current.on("moveend", () => {
				if (map.current) {
					const center = map.current.getCenter();
					setCenterLng(center.lng);
					setCenterLat(center.lat);
					setZoom(map.current.getZoom());
				}
			});

			map.current.on("zoomend", () => {
				if (map.current) {
					setZoom(map.current.getZoom());
				}
			});
		}

		return () => {
			map.current?.remove();
			map.current = null;
		};
	}, [handleUserLocation]);

	return (
		<div className="relative w-screen h-screen">
			<div ref={mapContainer} className="w-screen h-screen fixed inset-0" />
			<Clock longitude={centerLng} />
			<Elevation zoom={zoom} />
			<Coordinates latitude={centerLat} longitude={centerLng} />
			<CurrentLocation onLocationFound={handleUserLocation} />
			<AddLocation onLocationAdded={loadLocations} />
		</div>
	);
}
