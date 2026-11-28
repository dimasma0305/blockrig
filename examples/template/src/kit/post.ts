// Post effects (N8AO ambient occlusion, bloom on bright things, SMAA, ACES): blockrig/remotion/post, shared in BlockRig
// with its fixes (NaN-safe blurs, no black first frame, frame-pure noise).
export { usePost, createPost, POST_DEFAULTS, type PostOpts, type Post } from "blockrig/remotion/post";
