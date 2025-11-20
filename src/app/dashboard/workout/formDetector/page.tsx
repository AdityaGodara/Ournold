"use client";

import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // ensure WebGL backend is loaded


interface Keypoint {
    x: number;
    y: number;
    name: string;
}

export default function PostureDetection() {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [feedback, setFeedback] = useState("Loading model...");
    const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
        null
    );

    // 🧠 Calculate angle between three points
    const calculateAngle = (a: Keypoint, b: Keypoint, c: Keypoint): number => {
        const radians =
            Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs((radians * 180.0) / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    };

    // 🎯 Feedback logic (example: Squats)
    const checkSquatForm = (pose: poseDetection.Pose) => {
        if (!pose.keypoints) return "No pose detected.";

        const leftHip = pose.keypoints.find((k) => k.name === "left_hip");
        const leftKnee = pose.keypoints.find((k) => k.name === "left_knee");
        const leftAnkle = pose.keypoints.find((k) => k.name === "left_ankle");

        if (leftHip && leftKnee && leftAnkle) {
            const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
            if (angle > 160) return "Stand straight.";
            if (angle > 90 && angle <= 160) return "Good squat position!";
            if (angle <= 90) return "Too low — don’t overbend!";
        }

        return "Move into view for detection.";
    };

    // 🎥 Draw keypoints and skeleton
    const drawPose = (
        pose: poseDetection.Pose,
        ctx: CanvasRenderingContext2D
    ) => {
        const keypoints = pose.keypoints;
        if (!keypoints) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = "lime";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;

        // Draw keypoints
        keypoints.forEach((kp) => {
            if (kp.score && kp.score > 0.4) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    };

    // 🧠 Initialize detector
    useEffect(() => {
        const init = async () => {
            // Set backend explicitly to webgl (fastest for browser)
            await tf.setBackend("webgl");
            await tf.ready(); // wait until backend is ready

            const detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                }
            );

            setDetector(detector);
            setFeedback("Model ready! Start moving.");
        };

        init();
    }, []);



    // 🎬 Main detection loop
    useEffect(() => {
        if (!detector) return;

        const detect = async () => {
            if (
                webcamRef.current &&
                webcamRef.current.video &&
                webcamRef.current.video.readyState === 4
            ) {
                const video = webcamRef.current.video as HTMLVideoElement;
                const pose = await detector.estimatePoses(video);

                if (pose && pose[0]) {
                    const feedbackText = checkSquatForm(pose[0]);
                    setFeedback(feedbackText);

                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext("2d");
                    if (ctx && canvas) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        drawPose(pose[0], ctx);
                    }
                }
            }
            requestAnimationFrame(detect);
        };

        detect();
    }, [detector]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white relative">
            <div className="relative">
                <Webcam
                    ref={webcamRef}
                    className="rounded-xl"
                    mirrored={true}
                    style={{
                        width: 640,
                        height: 480,
                        transform: "scaleX(-1)", // mirror for user view
                    }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 rounded-xl"
                    width={640}
                    height={480}
                />
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded-lg shadow-md w-3/4 text-center">
                <h2 className="text-xl font-semibold">🧘 Exercise Feedback</h2>
                <p className="mt-2 text-lg text-green-400">{feedback}</p>
            </div>
        </div>
    );
}
