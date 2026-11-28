// Word-synced captions (blockrig/remotion Captions, shared and tested in BlockRig) in this video's font: Montserrat
// ExtraBold, white with a thick black outline, one highlighted word, speaker tags on dialogue lines.
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { Captions as BaseCaptions, CAPTION_TOP } from "blockrig/remotion";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export { CAPTION_TOP };
export const Captions = (p: Parameters<typeof BaseCaptions>[0]) => <BaseCaptions fontFamily={fontFamily} {...p} />;
