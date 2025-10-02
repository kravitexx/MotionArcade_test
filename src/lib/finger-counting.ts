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
    
    const fingerCurls = {
        thumb: handLandmarks[THUMB_TIP].y < handLandmarks[THUMB_IP].y,
        index: handLandmarks[INDEX_FINGER_TIP].y < handLandmarks[INDEX_FINGER_PIP].y,
        middle: handLandmarks[MIDDLE_FINGER_TIP].y < handLandmarks[MIDDLE_FINGER_PIP].y,
        ring: handLandmarks[RING_FINGER_TIP].y < handLandmarks[RING_FINGER_PIP].y,
        pinky: handLandmarks[PINKY_TIP].y < handLandmarks[PINKY_PIP].y,
    };
    
    // A more robust thumb check. The thumb is "up" if its tip is further from the wrist
    // in the x-direction than its MCP joint, considering handedness.
    if (hand === 'Right') {
      if (handLandmarks[THUMB_TIP].x < handLandmarks[THUMB_MCP].x) {
        raisedFingers++;
      }
    } else if (hand === 'Left') {
      if (handLandmarks[THUMB_TIP].x > handLandmarks[THUMB_MCP].x) {
        raisedFingers++;
      }
    }

    if (fingerCurls.index) raisedFingers++;
    if (fingerCurls.middle) raisedFingers++;
    if (fingerCurls.ring) raisedFingers++;
    if (fingerCurls.pinky) raisedFingers++;
    
    totalFingers += raisedFingers;
  }
  
  return totalFingers;
}
