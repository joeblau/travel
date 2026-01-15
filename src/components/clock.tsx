"use client";

import { useEffect, useState } from "react";

interface ClockProps {
	longitude: number;
}

export default function Clock({ longitude }: ClockProps) {
	const [time, setTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new Date());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const timeOffsetMs = (longitude / 15) * 60 * 60 * 1000;
	const utcTime = Date.UTC(
		time.getUTCFullYear(),
		time.getUTCMonth(),
		time.getUTCDate(),
		time.getUTCHours(),
		time.getUTCMinutes(),
		time.getUTCSeconds()
	);
	const localTime = new Date(utcTime + timeOffsetMs);

	const hours = localTime.getUTCHours();
	const minutes = localTime.getUTCMinutes();

	const hourAngle = ((hours % 12) + minutes / 60) * 30;
	const minuteAngle = minutes * 6;

	return (
		<div className="absolute top-4 left-4 w-16 h-16 bg-card/80 backdrop-blur-sm rounded-full shadow-lg border border-border z-10">
			<svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
				<circle cx="32" cy="32" r="30" fill="none" className="stroke-border" strokeWidth="1" />

				<line
					x1="32"
					y1="32"
					x2="32"
					y2="18"
					className="stroke-foreground"
					strokeWidth="3"
					strokeLinecap="round"
					style={{
						transform: `rotate(${hourAngle}deg)`,
						transformOrigin: "32px 32px",
						transition: "transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)"
					}}
				/>

				<line
					x1="32"
					y1="32"
					x2="32"
					y2="12"
					className="stroke-foreground"
					strokeWidth="2"
					strokeLinecap="round"
					style={{
						transform: `rotate(${minuteAngle}deg)`,
						transformOrigin: "32px 32px",
						transition: "transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)"
					}}
				/>

			</svg>
		</div>
	);
}
