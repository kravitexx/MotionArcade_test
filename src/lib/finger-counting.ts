import type { Landmark, Handedness } from '@mediapipe/tasks-vision';

// Landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_FINGER_MCP = 5;
const INDEX_FINGER_PIP = 6;
const INDEX_FINGER_DIP = 7;
const INDEX_FINGER_TIP = 8;
const MIDDLE_FINGER_MCP = 9;
const MIDDLE_FINGER_PIP = 10;
const MIDDLE_FINGER_DIP = 11;
const MIDDLE_FINGER_TIP = 12;
const RING_FINGER_MCP = 13;
const RING_FINGER_PIP = 14;
const RING_FINGER_DIP = 15;
const RING_FINGER_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

// Function to calculate the angle between three points
function getAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

export function countFingers(landmarks: Landmark[][], handedness: Handedness[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  let totalFingers = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    let raisedFingers = 0;

    // Check if fingers are straight based on y-coordinate
    // A finger is considered "up" if its tip is above its PIP joint
    if (handLandmarks[INDEX_FINGER_TIP].y < handLandmarks[INDEX_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[MIDDLE_FINGER_TIP].y < handLandmarks[MIDDLE_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[RING_FINGER_TIP].y < handLandmarks[RING_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[PINKY_TIP].y < handLandmarks[PINKY_PIP].y) raisedFingers++;

    // Thumb logic: A more robust check for thumb "up"
    // We check if the thumb tip is further out from the hand center than the MCP joint.
    // This handles both palm-facing and back-facing hands better.
    const hand = handedness[i][0].categoryName;
    if (hand === 'Right') {
      // For the right hand, the thumb is up if its tip's X is less than the MCP joint's X
      if (handLandmarks[THUMB_TIP].x < handLandmarks[THUMB_MCP].x) {
        raisedFingers++;
      }
    } else { // Left hand
      // For the left hand, the thumb is up if its tip's X is greater than the MCP joint's X
      if (handLandmarks[THUMB_TIP].x > handLandmarks[THUMB_MCP].x) {
        raisedFingers++;
      }
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
