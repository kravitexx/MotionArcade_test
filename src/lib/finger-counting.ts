import type { Landmark, Handedness } from '@mediapipe/tasks-vision';

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 6, 10, 14, 18];
const FINGER_DIPS = [0, 7, 11, 15, 19];
const THUMB_TIP_INDEX = 4;
const INDEX_FINGER_MCP_INDEX = 5;
const INDEX_FINGER_PIP_INDEX = 6;
const MIDDLE_FINGER_PIP_INDEX = 10;


export function countFingers(landmarks: Landmark[][], handedness: Handedness[]): number {
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
      const dip = handLandmarks[FINGER_DIPS[j]];
      if (tip.y < pip.y && pip.y < dip.y) {
        raisedFingers++;
      }
    }

    // Thumb
    const thumbTip = handLandmarks[THUMB_TIP_INDEX];
    const indexPip = handLandmarks[INDEX_FINGER_PIP_INDEX];
    const middlePip = handLandmarks[MIDDLE_FINGER_PIP_INDEX];

    if (hand === 'Right') {
        if (thumbTip.x < indexPip.x && thumbTip.y < indexPip.y && thumbTip.y < middlePip.y) {
            raisedFingers++;
        }
    } else if (hand === 'Left') {
        if (thumbTip.x > indexPip.x && thumbTip.y < indexPip.y && thumbTip.y < middlePip.y) {
            raisedFingers++;
        }
    }
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
