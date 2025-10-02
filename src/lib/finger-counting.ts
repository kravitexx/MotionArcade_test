import type { Landmark, Handedness } from '@mediapipe/tasks-vision';

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 6, 10, 14, 18];
const THUMB_TIP_INDEX = 4;
const INDEX_FINGER_MCP_INDEX = 5;

export function countFingers(landmarks: Landmark[], handedness: Handedness[]): number {
  if (!landmarks || landmarks.length === 0) {
    return 0;
  }

  let totalFingers = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const handLandmarks = landmarks[i];
    const hand = handedness[i] && handedness[i][0] ? handedness[i][0].categoryName : 'Unknown';

    let raisedFingers = 0;

    // Fingers (Index, Middle, Ring, Pinky)
    for (let j = 1; j < 5; j++) {
      const tip = handLandmarks[FINGER_TIPS[j]];
      const pip = handLandmarks[FINGER_PIPS[j]];
      if (tip.y < pip.y) {
        raisedFingers++;
      }
    }

    // Thumb
    const thumbTip = handLandmarks[THUMB_TIP_INDEX];
    const indexMcp = handLandmarks[INDEX_FINGER_MCP_INDEX];
    
    // Simple thumb detection: if thumb tip is further out on the x-axis than the index finger base
    if (hand === 'Right') {
      if (thumbTip.x < indexMcp.x) {
        raisedFingers++;
      }
    } else if (hand === 'Left') {
      if (thumbTip.x > indexMcp.x) {
        raisedFingers++;
      }
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
