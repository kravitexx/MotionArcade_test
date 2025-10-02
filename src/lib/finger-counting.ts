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

export function countFingers(landmarks: Landmark[][], handedness: Handedness[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  let totalFingers = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    const hand = handedness[i] && handedness[i][0] ? handedness[i][0].categoryName : 'Unknown';
    let raisedFingers = 0;

    // A finger is considered raised if its tip is "above" its PIP joint (smaller y-coordinate).
    const isIndexRaised = handLandmarks[INDEX_FINGER_TIP].y < handLandmarks[INDEX_FINGER_PIP].y;
    const isMiddleRaised = handLandmarks[MIDDLE_FINGER_TIP].y < handLandmarks[MIDDLE_FINGER_PIP].y;
    const isRingRaised = handLandmarks[RING_FINGER_TIP].y < handLandmarks[RING_FINGER_PIP].y;
    const isPinkyRaised = handLandmarks[PINKY_TIP].y < handLandmarks[PINKY_PIP].y;

    if (isIndexRaised) raisedFingers++;
    if (isMiddleRaised) raisedFingers++;
    if (isRingRaised) raisedFingers++;
    if (isPinkyRaised) raisedFingers++;

    // Thumb logic: A thumb is raised if its tip is further out from the palm center
    // than its IP joint. The direction depends on the hand (left/right).
    // This logic works for both palm and dorsal views.
    if (hand === 'Right') {
      if (handLandmarks[THUMB_TIP].x < handLandmarks[THUMB_IP].x) {
        raisedFingers++;
      }
    } else if (hand === 'Left') {
      if (handLandmarks[THUMB_TIP].x > handLandmarks[THUMB_IP].x) {
        raisedFingers++;
      }
    } else { // Fallback for unknown handedness
        const thumbBase = handLandmarks[THUMB_MCP];
        const indexBase = handLandmarks[INDEX_FINGER_MCP];
        // Guess handedness based on relative position of thumb and index base
        if (thumbBase.x < indexBase.x) { // Likely a Left hand from camera's perspective
             if (handLandmarks[THUMB_TIP].x > handLandmarks[THUMB_IP].x) {
                raisedFingers++;
             }
        } else { // Likely a Right hand
             if (handLandmarks[THUMB_TIP].x < handLandmarks[THUMB_IP].x) {
                raisedFingers++;
             }
        }
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
