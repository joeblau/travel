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
			});

			map.current.on("style.load", () => {
				if (map.current) {
					map.current.setFog({
						color: "rgb(186, 210, 235)",
						"high-color": "rgb(36, 92, 223)",
						"horizon-blend": 0.02,
						"space-color": "rgb(11, 11, 25)",
						"star-intensity": 0.6,
					});
				}
			});

			map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

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
