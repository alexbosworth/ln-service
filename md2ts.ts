import * as unified from "unified"
import * as markdown from "remark-parse"
import * as fs from "fs"

const file = fs.readFileSync("./README.md")

const tree = unified().use(markdown).parse(file)

console.log(
	tree.children
		.filter(({ type, depth }) => type === "heading" && depth === 3)
		.map(({ children }) => children),
)
