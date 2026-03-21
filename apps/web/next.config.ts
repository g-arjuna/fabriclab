import path from "node:path";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: { remarkPlugins: ["remark-gfm"] },
});

export default withMDX({
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    root: path.resolve(__dirname),
  },
});
