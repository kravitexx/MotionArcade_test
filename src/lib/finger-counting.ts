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
    
    // Check if fingers (index, middle, ring, pinky) are raised.
    // A finger is considered raised if its tip is higher (smaller y-coordinate) than its PIP joint.
    if (handLandmarks[INDEX_FINGER_TIP].y < handLandmarks[INDEX_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[MIDDLE_FINGER_TIP].y < handLandmarks[MIDDLE_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[RING_FINGER_TIP].y < handLandmarks[RING_FINGER_PIP].y) raisedFingers++;
    if (handLandmarks[PINKY_TIP].y < handLandmarks[PINKY_PIP].y) raisedFingers++;

    // Check for the thumb. This is trickier due to its rotation.
    // A more reliable way is to check the horizontal distance.
    // For a 'Right' hand shown with palm facing camera, a raised thumb's tip will have a smaller x-coordinate than the index finger's MCP joint.
    // For a 'Left' hand, it's the opposite.
    // This logic holds even when the hand is flipped, because handedness is detected by the model.
    if (hand === 'Right') {
      if (handLandmarks[THUMB_TIP].x < handLandmarks[INDEX_FINGER_MCP].x) {
        raisedFingers++;
      }
    } else if (hand === 'Left') {
      if (handLandmarks[THUMB_TIP].x > handLandmarks[INDEX_FINGER_MCP].x) {
        raisedFingers++;
      }
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
