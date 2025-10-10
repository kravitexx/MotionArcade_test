import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Initializes the HandLandmarker from MediaPipe.
 * This flow is used in the debug page to verify that the hand tracking model
 * can be loaded and initialized correctly.
 */
export async function initializeHandTracking(): Promise<{ status: string; message: string }> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );

    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });

    if (!handLandmarker) {
      throw new Error('Failed to create HandLandmarker instance.');
    }

    // The instance itself is complex, so we just return a success message.
    return {
      status: 'Success',
      message: 'HandLandmarker initialized successfully.',
    };

  } catch (error: any) {
    console.error('[Air Piano Flow] Error initializing hand tracking:', error);
    // Re-throw the error to be caught by the debug page handler
    throw new Error(
      `Failed to initialize MediaPipe HandLandmarker: ${error.message || 'Unknown error'}`
    );
  }
}
