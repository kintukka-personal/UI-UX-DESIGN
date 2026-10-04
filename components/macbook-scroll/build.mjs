// Regenerates script.js from the two .jsx files, for pages without a build step.
//   npm i -D esbuild && node build.mjs
// React and Motion are not bundled: they resolve to the window.React and
// window.Motion globals that index.html loads from the CDN.
import { build } from "esbuild";

const globals = {
  react: "module.exports = window.React;",
  "motion/react": "module.exports = window.Motion;",
  "react/jsx-runtime": `
    const R = window.React;
    const jsx = (type, props, key) => R.createElement(type, key === undefined ? props : { ...props, key });
    module.exports = { jsx, jsxs: jsx, Fragment: R.Fragment };`,
};

await build({
  stdin: {
    contents: `
      export { MacbookScroll } from "./MacbookScroll.jsx";
      export { MacbookScrollDemo } from "./MacbookScrollDemo.jsx";`,
    resolveDir: ".",
    loader: "js",
  },
  bundle: true,
  format: "iife",
  globalName: "MacbookScrollKit",
  footer: { js: "window.MacbookScroll = MacbookScrollKit.MacbookScroll;\nwindow.MacbookScrollDemo = MacbookScrollKit.MacbookScrollDemo;" },
  banner: { js: "/* GENERATED from MacbookScroll.jsx and MacbookScrollDemo.jsx by build.mjs. Do not edit by hand. */" },
  jsx: "automatic",
  target: "es2019",
  outfile: "script.js",
  plugins: [
    {
      name: "globals",
      setup(b) {
        b.onResolve({ filter: /^(react|react\/jsx-runtime|motion\/react)$/ }, (a) => ({ path: a.path, namespace: "global" }));
        b.onResolve({ filter: /^@\/components\/ui\/macbook-scroll$/ }, () => ({ path: new URL("./MacbookScroll.jsx", import.meta.url).pathname }));
        b.onLoad({ filter: /.*/, namespace: "global" }, (a) => ({ contents: globals[a.path], loader: "js" }));
      },
    },
  ],
});
console.log("wrote script.js");
