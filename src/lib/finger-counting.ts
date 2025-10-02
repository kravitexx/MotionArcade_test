import type { Landmark, Handedness } from '@mediapipe/tasks-vision';

// landmark indices
const THUMB_TIP = 4;
const THUMB_IP = 3;
const THUMB_MCP = 2;

const INDEX_FINGER_TIP = 8;
const INDEX_FINGER_PIP = 6;

const MIDDLE_FINGER_TIP = 12;
const MIDDLE_FINGER_PIP = 10;

const RING_FINGER_TIP = 16;
const RING_FINGER_PIP = 14;

const PINKY_TIP = 20;
const PINKY_PIP = 18;

export function countFingers(landmarks: Landmark[][], handedness: Handedness[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  let totalFingers = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    const hand = handedness[i] && handedness[i][0] ? handedness[i][0].categoryName : 'Unknown';
    let raisedFingers = 0;

    // Fingers (Index, Middle, Ring, Pinky) are considered "up" if the tip is above the PIP joint.
    if (handLandmarks[INDEX_FINGER_TIP].y < handLandmarks[INDEX_FINGER_PIP].y) {
      raisedFingers++;
    }
    if (handLandmarks[MIDDLE_FINGER_TIP].y < handLandmarks[MIDDLE_FINGER_PIP].y) {
      raisedFingers++;
    }
    if (handLandmarks[RING_FINGER_TIP].y < handLandmarks[RING_FINGER_PIP].y) {
      raisedFingers++;
    }
    if (handLandmarks[PINKY_TIP].y < handLandmarks[PINKY_PIP].y) {
      raisedFingers++;
    }

    // Thumb is trickier. We check if the tip is further from the center of the hand
    // horizontally than the joint below it.
    if (hand === 'Right') {
      if (handLandmarks[THUMB_TIP].x < handLandmarks[THUMB_IP].x) {
        raisedFingers++;
      }
    } else if (hand === 'Left') {
      if (handLandmarks[THUMB_TIP].x > handLandmarks[THUMB_IP].x) {
        raisedFingers++;
      }
    }
    
    totalFingers += raisedFingers;
  }
  
  // Since we check two hands, we sum them up. But if only one hand is visible, this is fine.
  // The current logic in the game only seems to care about the total number anyway.
  return totalFingers;
}
