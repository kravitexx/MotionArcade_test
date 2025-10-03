import SketchAndScoreClient from "./SketchAndScoreClient";

export const metadata = {
  title: "Sketch & Score | MotionArcade",
  description: "Draw shapes with your hands and see if the AI recognizes them!",
};

export default function SketchAndScorePage() {
  return <SketchAndScoreClient />;
}
