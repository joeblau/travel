"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Clock from "./clock";

export default function Map() {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const [centerLng, setCenterLng] = useState(0);

	useEffect(() => {
		if (map.current) return;

		const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

		if (!mapboxToken) {
			console.error("Mapbox token is not set. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file");
			return;
		}

		mapboxgl.accessToken = mapboxToken;

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
					map.current.setFog({
						color: "rgb(186, 210, 235)",
						"high-color": "rgb(36, 92, 223)",
						"horizon-blend": 0.02,
						"space-color": "rgb(11, 11, 25)",
						"star-intensity": 0.6,
					});

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
				}
			});

			map.current.on("moveend", () => {
				if (map.current) {
					const center = map.current.getCenter();
					setCenterLng(center.lng);
				}
			});
		}

		return () => {
			map.current?.remove();
			map.current = null;
		};
	}, []);

	return (
		<div className="relative w-screen h-screen">
			<div ref={mapContainer} className="w-screen h-screen fixed inset-0" />
			<Clock longitude={centerLng} />
		</div>
	);
}
