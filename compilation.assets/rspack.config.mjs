import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ["chrome >= 87", "edge >= 88", "firefox >= 78", "safari >= 14"];

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
			// 在 Rust 侧，JsCompilation 的定义如下:
			// pub struct JsCompilation(pub(crate) &'static mut rspack_core::Compilation);
			//
			// &'static mut rspack_core::Compilation 是通过 unsafe 方法 std::mem::transmute
			// 从 &mut rspack_core::Compilation 转换而来的。
			//
			// 这使得在 JS 侧对 rspack_core::Compilation 实例的修改不受生命周期约束，用户可以在任何时刻调用
			// 修改 rspack_core::Compilation 的方法
			//
			// 本例的目的是展示由于 JsCompilation 的可变性不受 Rust 借用规则的约束而引发的问题
			// 在 emit hook 内，我们使 JS 线程在下一个事件循环中删除 key 为 main.js 的 asset
			// 这会导致删除操作与 Rust 端遍历 compilation.assets 的代码同时进行，从而使 Rust 遍历器
			// 访问已删除的内存块，导致错误
			//
			// 更不可接受的是，错误发生后没有任何错误信息。
			compiler.hooks.emit.tap("PLUGIN", compilation => {
				setTimeout(() => {
					delete compilation.assets['main.js'];
				});
			})
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
