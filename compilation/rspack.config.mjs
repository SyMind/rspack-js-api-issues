import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ["chrome >= 87", "edge >= 88", "firefox >= 78", "safari >= 14"];

let lastCompilation = null;

export default defineConfig({
	entry: {
		main: "./src/index.js"
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset"
			},
			{
				test: /\.js$/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "ecmascript"
								}
							},
							env: { targets }
						}
					}
				]
			}
		]
	},
	plugins: [
		new rspack.HtmlRspackPlugin({ template: "./index.html" }),
		
		compiler => {
			compiler.hooks.compilation.tap("PLUGIN", compilation => {
				compilation.hooks.afterSeal.tap("PLUGIN", () => {
					if (lastCompilation) {
						// 当前 Compilation 和最后一次 Compilation 的 hash 是相同的。
						// 这是因为在 Rust 端，JsCompilation 中直接存储的是 Compilation 的指针。
						// 每次构建时，通过 mem::replace() 将旧的 Compilation 替换为新的 Compilation，
						// 因此地址不变。这意味着旧的 JsCompilation 仍然有效，因为它指向有效地址，但值是新的 Compilation。
						console.log('lastCompilation.hash == compilation.hash', lastCompilation.hash == compilation.hash)
					} else {
						lastCompilation = compilation;
					}
				});
			});
		}
	],
	optimization: {
		minimizer: [
			new rspack.SwcJsMinimizerRspackPlugin(),
			new rspack.LightningCssMinimizerRspackPlugin({
				minimizerOptions: { targets }
			})
		]
	},
	experiments: {
		css: true
	}
});
