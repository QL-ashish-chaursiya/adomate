import React, { useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { createFabricCanvas, setupCanvasSnapping } from '../utils';

interface CanvasProps {
	onCanvasReady: (canvas: fabric.Canvas) => void;
	className?: string;
}

const Canvas: React.FC<CanvasProps> = ({ onCanvasReady, className = '' }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onReadyRef = useRef(onCanvasReady);

	// Keep latest callback without retriggering init
	useEffect(() => {
		onReadyRef.current = onCanvasReady;
	}, [onCanvasReady]);
	
	useEffect(() => {
		if (!canvasRef.current) return;

		const canvas = createFabricCanvas(canvasRef.current);
		setupCanvasSnapping(canvas);
		
		// Call the latest onCanvasReady without making this effect depend on it
		onReadyRef.current(canvas);

		return () => {
			canvas.dispose();
		};
	// Initialize once for the lifetime of this component
	}, []);

	return (
		<div className={`border-2 border-gray-300 flex-1 rounded mb-4 inline-block ${className}`}>
			<canvas ref={canvasRef} />
		</div>
	);
};

export default Canvas;
