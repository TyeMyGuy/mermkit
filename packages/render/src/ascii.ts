/* eslint-disable max-lines */

type Direction = { x: number; y: number };

type GridCoord = { x: number; y: number };

type DrawingCoord = { x: number; y: number };

type Drawing = string[][];

type StyleClass = {
  name: string;
  styles: Record<string, string>;
};

type TextNode = {
  name: string;
  styleClass: string;
};

type TextEdge = {
  parent: TextNode;
  child: TextNode;
  label: string;
};

type TextSubgraph = {
  name: string;
  nodes: string[];
  parent?: TextSubgraph;
  children: TextSubgraph[];
};

type GraphProperties = {
  data: Map<string, TextEdge[]>;
  styleClasses: Map<string, StyleClass>;
  graphDirection: "LR" | "TD" | "";
  styleType: "cli" | "html";
  paddingX: number;
  paddingY: number;
  subgraphs: TextSubgraph[];
  useAscii: boolean;
  boxBorderPadding: number;
};

type Node = {
  name: string;
  drawing?: Drawing;
  drawingCoord?: DrawingCoord;
  gridCoord?: GridCoord;
  drawn: boolean;
  index: number;
  styleClassName: string;
  styleClass: StyleClass;
};

type Edge = {
  from: Node;
  to: Node;
  text: string;
  path: GridCoord[];
  labelLine: GridCoord[];
  startDir: Direction;
  endDir: Direction;
};

type Subgraph = {
  name: string;
  nodes: Node[];
  parent?: Subgraph;
  children: Subgraph[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type SequenceDiagram = {
  participants: Participant[];
  messages: Message[];
  autonumber: boolean;
};

type Participant = {
  id: string;
  label: string;
  index: number;
};

type Message = {
  from: Participant;
  to: Participant;
  label: string;
  arrowType: ArrowType;
  number: number;
};

enum ArrowType {
  Solid = "solid",
  Dotted = "dotted"
}

type BoxChars = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  teeDown: string;
  teeRight: string;
  teeLeft: string;
  cross: string;
  arrowRight: string;
  arrowLeft: string;
  solidLine: string;
  dottedLine: string;
  selfTopRight: string;
  selfBottom: string;
};

type DiagramConfig = {
  useAscii: boolean;
  showCoords: boolean;
  verbose: boolean;
  boxBorderPadding: number;
  paddingBetweenX: number;
  paddingBetweenY: number;
  graphDirection: "LR" | "TD";
  styleType: "cli" | "html";
  sequenceParticipantSpacing: number;
  sequenceMessageSpacing: number;
  sequenceSelfMessageWidth: number;
};

export type AsciiRenderOptions = Partial<DiagramConfig>;

const sequenceDiagramKeyword = "sequenceDiagram";
const solidArrowSyntax = "->>";
const dottedArrowSyntax = "-->>";

const defaultConfig: DiagramConfig = {
  useAscii: false,
  showCoords: false,
  verbose: false,
  boxBorderPadding: 1,
  paddingBetweenX: 5,
  paddingBetweenY: 5,
  graphDirection: "LR",
  styleType: "cli",
  sequenceParticipantSpacing: 5,
  sequenceMessageSpacing: 1,
  sequenceSelfMessageWidth: 4
};

const junctionChars = new Set([
  "─",
  "│",
  "┌",
  "┐",
  "└",
  "┘",
  "├",
  "┤",
  "┬",
  "┴",
  "┼",
  "╴",
  "╵",
  "╶",
  "╷"
]);

const asciiChars: BoxChars = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  teeDown: "+",
  teeRight: "+",
  teeLeft: "+",
  cross: "+",
  arrowRight: ">",
  arrowLeft: "<",
  solidLine: "-",
  dottedLine: ".",
  selfTopRight: "+",
  selfBottom: "+"
};

const unicodeChars: BoxChars = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  teeDown: "┬",
  teeRight: "├",
  teeLeft: "┤",
  cross: "┼",
  arrowRight: "►",
  arrowLeft: "◄",
  solidLine: "─",
  dottedLine: "┈",
  selfTopRight: "┐",
  selfBottom: "┘"
};

const directions = {
  up: { x: 1, y: 0 },
  down: { x: 1, y: 2 },
  left: { x: 0, y: 1 },
  right: { x: 2, y: 1 },
  upperRight: { x: 2, y: 0 },
  upperLeft: { x: 0, y: 0 },
  lowerRight: { x: 2, y: 2 },
  lowerLeft: { x: 0, y: 2 },
  middle: { x: 1, y: 1 }
} as const;

function normalizeConfig(options: AsciiRenderOptions = {}): DiagramConfig {
  const config: DiagramConfig = {
    ...defaultConfig,
    ...options
  };

  if (config.graphDirection !== "LR" && config.graphDirection !== "TD") {
    throw new Error(`invalid graphDirection: ${config.graphDirection}`);
  }
  if (config.styleType !== "cli" && config.styleType !== "html") {
    throw new Error(`invalid styleType: ${config.styleType}`);
  }
  if (config.boxBorderPadding < 0) {
    throw new Error("boxBorderPadding must be non-negative");
  }
  if (config.paddingBetweenX < 0 || config.paddingBetweenY < 0) {
    throw new Error("paddingBetweenX/paddingBetweenY must be non-negative");
  }
  if (config.sequenceParticipantSpacing < 0 || config.sequenceMessageSpacing < 0) {
    throw new Error("sequence spacing must be non-negative");
  }
  if (config.sequenceSelfMessageWidth < 2) {
    throw new Error("sequenceSelfMessageWidth must be at least 2");
  }
  return config;
}

function makeLogger(verbose: boolean) {
  return {
    debug: (...args: unknown[]) => {
      if (verbose) {
        // eslint-disable-next-line no-console
        console.debug(...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (verbose) {
        // eslint-disable-next-line no-console
        console.warn(...args);
      }
    }
  };
}

function min(a: number, b: number) {
  return a < b ? a : b;
}

function max(a: number, b: number) {
  return a > b ? a : b;
}

function abs(a: number) {
  return a < 0 ? -a : a;
}

function ceilDiv(x: number, y: number) {
  if (y === 0) return 0;
  return x % y === 0 ? x / y : Math.floor(x / y) + 1;
}

function gridKey(coord: GridCoord) {
  return `${coord.x},${coord.y}`;
}

function gridEquals(a: GridCoord, b: GridCoord) {
  return a.x === b.x && a.y === b.y;
}

function drawingEquals(a: DrawingCoord, b: DrawingCoord) {
  return a.x === b.x && a.y === b.y;
}

function directionOpposite(dir: Direction): Direction {
  if (dir === directions.up) return directions.down;
  if (dir === directions.down) return directions.up;
  if (dir === directions.left) return directions.right;
  if (dir === directions.right) return directions.left;
  if (dir === directions.upperRight) return directions.lowerLeft;
  if (dir === directions.upperLeft) return directions.lowerRight;
  if (dir === directions.lowerRight) return directions.upperLeft;
  if (dir === directions.lowerLeft) return directions.upperRight;
  return directions.middle;
}

function gridDirection(coord: GridCoord, dir: Direction): GridCoord {
  return { x: coord.x + dir.x, y: coord.y + dir.y };
}

function drawingDirection(coord: DrawingCoord, dir: Direction): DrawingCoord {
  return { x: coord.x + dir.x, y: coord.y + dir.y };
}

function determineDirection(from: GridCoord, to: GridCoord): Direction {
  if (from.x === to.x) {
    return from.y < to.y ? directions.down : directions.up;
  }
  if (from.y === to.y) {
    return from.x < to.x ? directions.right : directions.left;
  }
  if (from.x < to.x) {
    return from.y < to.y ? directions.lowerRight : directions.upperRight;
  }
  return from.y < to.y ? directions.lowerLeft : directions.upperLeft;
}

function splitLines(input: string): string[] {
  return input.split(/\n|\\n/);
}

function removeComments(lines: string[]): string[] {
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("%%")) continue;
    const idx = line.indexOf("%%");
    let updated = line;
    if (idx !== -1) {
      updated = line.slice(0, idx).trim();
    }
    if (updated.trim().length > 0) {
      cleaned.push(updated);
    }
  }
  return cleaned;
}

function isSequenceDiagram(input: string): boolean {
  const lines = input.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("%%")) continue;
    return trimmed.startsWith(sequenceDiagramKeyword);
  }
  return false;
}

function parseNode(line: string): TextNode {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+):::(.+)$/);
  if (match) {
    return { name: match[1].trim(), styleClass: match[2].trim() };
  }
  return { name: trimmed, styleClass: "" };
}

function parseStyleClass(match: RegExpMatchArray): StyleClass {
  const className = match[1];
  const styles = match[2];
  const styleMap: Record<string, string> = {};
  for (const style of styles.split(",")) {
    const [key, value] = style.split(":");
    if (key) {
      styleMap[key] = value ?? "";
    }
  }
  return { name: className, styles: styleMap };
}

function addNode(node: TextNode, data: Map<string, TextEdge[]>) {
  if (!data.has(node.name)) {
    data.set(node.name, []);
  }
}

function setData(parent: TextNode, edge: TextEdge, data: Map<string, TextEdge[]>) {
  const existing = data.get(parent.name);
  if (existing) {
    existing.push(edge);
  } else {
    data.set(parent.name, [edge]);
  }
  if (!data.has(edge.child.name)) {
    data.set(edge.child.name, []);
  }
}

function setArrowWithLabel(
  lhs: TextNode[],
  rhs: TextNode[],
  label: string,
  data: Map<string, TextEdge[]>
): TextNode[] {
  for (const l of lhs) {
    for (const r of rhs) {
      setData(l, { parent: l, child: r, label }, data);
    }
  }
  return rhs;
}

function setArrow(lhs: TextNode[], rhs: TextNode[], data: Map<string, TextEdge[]>): TextNode[] {
  return setArrowWithLabel(lhs, rhs, "", data);
}

function mermaidFileToMap(mermaid: string, config: DiagramConfig): GraphProperties {
  const rawLines = splitLines(mermaid).flatMap((line) => line.split(";"));
  const lines: string[] = [];

  for (const raw of rawLines) {
    if (raw === "---") break;
    const trimmed = raw.trim();
    if (trimmed.startsWith("%%")) continue;
    const idx = raw.indexOf("%%");
    const line = idx === -1 ? raw : raw.slice(0, idx).trim();
    if (line.trim().length > 0) {
      lines.push(line);
    }
  }

  const data = new Map<string, TextEdge[]>();
  const styleClasses = new Map<string, StyleClass>();
  const props: GraphProperties = {
    data,
    styleClasses,
    graphDirection: "",
    styleType: config.styleType,
    paddingX: config.paddingBetweenX,
    paddingY: config.paddingBetweenY,
    subgraphs: [],
    useAscii: config.useAscii,
    boxBorderPadding: config.boxBorderPadding
  };

  const paddingRegex = /^padding([xy])\s*=\s*(\d+)$/i;
  let remaining = [...lines];
  while (remaining.length > 0) {
    const trimmed = remaining[0].trim();
    if (trimmed === "") {
      remaining = remaining.slice(1);
      continue;
    }
    const match = trimmed.match(paddingRegex);
    if (match) {
      const value = Number.parseInt(match[2], 10);
      if (Number.isNaN(value)) {
        throw new Error(`invalid padding value: ${match[2]}`);
      }
      if (match[1].toLowerCase() === "x") {
        props.paddingX = value;
      } else {
        props.paddingY = value;
      }
      remaining = remaining.slice(1);
      continue;
    }
    break;
  }

  if (remaining.length === 0) {
    throw new Error("missing graph definition");
  }

  switch (remaining[0].trim()) {
    case "graph LR":
    case "flowchart LR":
      props.graphDirection = "LR";
      break;
    case "graph TD":
    case "flowchart TD":
    case "graph TB":
    case "flowchart TB":
      props.graphDirection = "TD";
      break;
    default:
      throw new Error(
        `unsupported graph type '${remaining[0]}'. Supported types: graph TD, graph TB, graph LR, flowchart TD, flowchart TB, flowchart LR`
      );
  }

  remaining = remaining.slice(1);

  const subgraphStack: TextSubgraph[] = [];
  const subgraphRegex = /^\s*subgraph\s+(.+)$/i;
  const endRegex = /^\s*end\s*$/i;

  for (const line of remaining) {
    const trimmedLine = line.trim();

    const subMatch = trimmedLine.match(subgraphRegex);
    if (subMatch) {
      const subgraphName = subMatch[1].trim();
      const newSubgraph: TextSubgraph = {
        name: subgraphName,
        nodes: [],
        children: []
      };
      if (subgraphStack.length > 0) {
        const parent = subgraphStack[subgraphStack.length - 1];
        newSubgraph.parent = parent;
        parent.children.push(newSubgraph);
      }
      subgraphStack.push(newSubgraph);
      props.subgraphs.push(newSubgraph);
      continue;
    }

    if (endRegex.test(trimmedLine)) {
      if (subgraphStack.length > 0) {
        subgraphStack.pop();
      }
      continue;
    }

    const existingNodes = new Set<string>();
    for (const [key] of data) {
      existingNodes.add(key);
    }

    const nodes = parseGraphLine(line, props);
    if (!nodes) {
      const node = parseNode(line);
      addNode(node, data);
    } else {
      for (const node of nodes) {
        addNode(node, data);
      }
    }

    if (subgraphStack.length > 0) {
      for (const [nodeName] of data) {
        if (!existingNodes.has(nodeName)) {
          for (const sg of subgraphStack) {
            if (!sg.nodes.includes(nodeName)) {
              sg.nodes.push(nodeName);
            }
          }
        }
      }
    }
  }

  return props;
}

function parseGraphLine(line: string, props: GraphProperties): TextNode[] | null {
  const trimmed = line.trim();
  if (trimmed === "") return [];

  const arrowLabel = trimmed.match(/^(.+?)\s*-->\|(.+)\|\s*(.+)$/);
  if (arrowLabel) {
    const lhs = parseGraphLine(arrowLabel[1], props) ?? [parseNode(arrowLabel[1])];
    const rhs = parseGraphLine(arrowLabel[3], props) ?? [parseNode(arrowLabel[3])];
    return setArrowWithLabel(lhs, rhs, arrowLabel[2], props.data);
  }

  const arrow = trimmed.match(/^(.+?)\s*-->\s*(.+)$/);
  if (arrow) {
    const lhs = parseGraphLine(arrow[1], props) ?? [parseNode(arrow[1])];
    const rhs = parseGraphLine(arrow[2], props) ?? [parseNode(arrow[2])];
    return setArrow(lhs, rhs, props.data);
  }

  const classDef = trimmed.match(/^classDef\s+(.+)\s+(.+)$/);
  if (classDef) {
    const style = parseStyleClass(classDef);
    props.styleClasses.set(style.name, style);
    return [];
  }

  const andMatch = trimmed.match(/^(.+) & (.+)$/);
  if (andMatch) {
    const lhs = parseGraphLine(andMatch[1], props) ?? [parseNode(andMatch[1])];
    const rhs = parseGraphLine(andMatch[2], props) ?? [parseNode(andMatch[2])];
    return [...lhs, ...rhs];
  }

  return null;
}

class Graph {
  nodes: Node[] = [];
  edges: Edge[] = [];
  drawing: Drawing;
  grid: Map<string, Node> = new Map();
  columnWidth: Map<number, number> = new Map();
  rowHeight: Map<number, number> = new Map();
  styleClasses: Map<string, StyleClass> = new Map();
  styleType: "cli" | "html";
  paddingX: number;
  paddingY: number;
  subgraphs: Subgraph[] = [];
  offsetX = 0;
  offsetY = 0;
  useAscii = false;
  graphDirection: "LR" | "TD";
  boxBorderPadding: number;
  logger: ReturnType<typeof makeLogger>;

  constructor(props: GraphProperties, logger: ReturnType<typeof makeLogger>) {
    this.drawing = mkDrawing(0, 0);
    this.styleType = props.styleType;
    this.paddingX = props.paddingX;
    this.paddingY = props.paddingY;
    this.graphDirection = props.graphDirection === "" ? "LR" : props.graphDirection;
    this.useAscii = props.useAscii;
    this.boxBorderPadding = props.boxBorderPadding;
    this.logger = logger;

    let index = 0;
    for (const [nodeName, children] of props.data) {
      let parentNode = this.getNode(nodeName);
      if (!parentNode) {
        parentNode = this.createNode(nodeName, index, "");
        index += 1;
      }
      for (const textEdge of children) {
        let childNode = this.getNode(textEdge.child.name);
        if (!childNode) {
          childNode = this.createNode(textEdge.child.name, index, textEdge.child.styleClass);
          parentNode.styleClassName = textEdge.parent.styleClass;
          index += 1;
        }
        const e: Edge = {
          from: parentNode,
          to: childNode,
          text: textEdge.label,
          path: [],
          labelLine: [],
          startDir: directions.right,
          endDir: directions.left
        };
        this.edges.push(e);
      }
    }

    this.setStyleClasses(props);
    this.setSubgraphs(props.subgraphs);
  }

  createNode(name: string, index: number, styleClassName: string): Node {
    const node: Node = {
      name,
      drawn: false,
      index,
      styleClassName,
      styleClass: { name: "", styles: {} }
    };
    this.nodes.push(node);
    return node;
  }

  getNode(name: string): Node | undefined {
    return this.nodes.find((node) => node.name === name);
  }

  getColumnWidth(index: number): number {
    return this.columnWidth.get(index) ?? 0;
  }

  getRowHeight(index: number): number {
    return this.rowHeight.get(index) ?? 0;
  }

  setColumnWidthValue(index: number, value: number): void {
    this.columnWidth.set(index, value);
  }

  setRowHeightValue(index: number, value: number): void {
    this.rowHeight.set(index, value);
  }

  setStyleClasses(props: GraphProperties): void {
    this.styleClasses = props.styleClasses;
    this.styleType = props.styleType;
    this.paddingX = props.paddingX;
    this.paddingY = props.paddingY;
    for (const node of this.nodes) {
      if (node.styleClassName) {
        const style = this.styleClasses.get(node.styleClassName);
        if (style) node.styleClass = style;
      }
    }
  }

  setSubgraphs(textSubgraphs: TextSubgraph[]): void {
    this.subgraphs = [];
    for (const tsg of textSubgraphs) {
      const sg: Subgraph = {
        name: tsg.name,
        nodes: [],
        children: [],
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
      };
      for (const nodeName of tsg.nodes) {
        const node = this.getNode(nodeName);
        if (node) sg.nodes.push(node);
      }
      this.subgraphs.push(sg);
    }

    for (let i = 0; i < textSubgraphs.length; i += 1) {
      const tsg = textSubgraphs[i];
      const sg = this.subgraphs[i];
      if (tsg.parent) {
        const parentIndex = textSubgraphs.indexOf(tsg.parent);
        if (parentIndex !== -1) {
          sg.parent = this.subgraphs[parentIndex];
        }
      }
      for (const child of tsg.children) {
        const childIndex = textSubgraphs.indexOf(child);
        if (childIndex !== -1) {
          sg.children.push(this.subgraphs[childIndex]);
        }
      }
    }
  }

  createMapping(): void {
    const highestPositionPerLevel = Array.from({ length: 100 }, () => 0);

    const nodesFound = new Set<string>();
    const rootNodes: Node[] = [];

    for (const node of this.nodes) {
      if (!nodesFound.has(node.name)) {
        rootNodes.push(node);
      }
      nodesFound.add(node.name);
      for (const child of this.getChildren(node)) {
        nodesFound.add(child.name);
      }
    }

    let hasExternalRoots = false;
    let hasSubgraphRootsWithEdges = false;
    for (const node of rootNodes) {
      if (this.isNodeInAnySubgraph(node)) {
        if (this.getChildren(node).length > 0) {
          hasSubgraphRootsWithEdges = true;
        }
      } else {
        hasExternalRoots = true;
      }
    }

    const shouldSeparate = this.graphDirection === "LR" && hasExternalRoots && hasSubgraphRootsWithEdges;

    const externalRootNodes: Node[] = [];
    const subgraphRootNodes: Node[] = [];

    if (shouldSeparate) {
      for (const node of rootNodes) {
        if (this.isNodeInAnySubgraph(node)) {
          subgraphRootNodes.push(node);
        } else {
          externalRootNodes.push(node);
        }
      }
    } else {
      externalRootNodes.push(...rootNodes);
    }

    for (const node of externalRootNodes) {
      let mappingCoord: GridCoord | undefined;
      if (this.graphDirection === "LR") {
        mappingCoord = this.reserveSpotInGrid(node, { x: 0, y: highestPositionPerLevel[0] });
      } else {
        mappingCoord = this.reserveSpotInGrid(node, { x: highestPositionPerLevel[0], y: 0 });
      }
      node.gridCoord = mappingCoord;
      highestPositionPerLevel[0] += 4;
    }

    if (shouldSeparate && subgraphRootNodes.length > 0) {
      const subgraphLevel = 4;
      for (const node of subgraphRootNodes) {
        let mappingCoord: GridCoord | undefined;
        if (this.graphDirection === "LR") {
          mappingCoord = this.reserveSpotInGrid(node, { x: subgraphLevel, y: highestPositionPerLevel[subgraphLevel] });
        } else {
          mappingCoord = this.reserveSpotInGrid(node, { x: highestPositionPerLevel[subgraphLevel], y: subgraphLevel });
        }
        node.gridCoord = mappingCoord;
        highestPositionPerLevel[subgraphLevel] += 4;
      }
    }

    for (const node of this.nodes) {
      const childLevel = this.graphDirection === "LR" ? (node.gridCoord?.x ?? 0) + 4 : (node.gridCoord?.y ?? 0) + 4;
      let highestPosition = highestPositionPerLevel[childLevel];
      for (const child of this.getChildren(node)) {
        if (child.gridCoord) continue;
        let mappingCoord: GridCoord | undefined;
        if (this.graphDirection === "LR") {
          mappingCoord = this.reserveSpotInGrid(child, { x: childLevel, y: highestPosition });
        } else {
          mappingCoord = this.reserveSpotInGrid(child, { x: highestPosition, y: childLevel });
        }
        child.gridCoord = mappingCoord;
        highestPositionPerLevel[childLevel] = highestPosition + 4;
        highestPosition = highestPositionPerLevel[childLevel];
      }
    }

    for (const node of this.nodes) {
      this.setColumnWidth(node);
    }

    for (const edge of this.edges) {
      this.determinePath(edge);
      this.increaseGridSizeForPath(edge.path);
      this.determineLabelLine(edge);
    }

    for (const node of this.nodes) {
      if (!node.gridCoord) continue;
      const dc = this.gridToDrawingCoord(node.gridCoord);
      node.drawingCoord = dc;
      node.drawing = drawBox(node, this);
    }

    this.setDrawingSizeToGridConstraints();
    this.calculateSubgraphBoundingBoxes();
    this.offsetDrawingForSubgraphs();
  }

  reserveSpotInGrid(node: Node, requested: GridCoord): GridCoord {
    if (this.grid.has(gridKey(requested))) {
      if (this.graphDirection === "LR") {
        return this.reserveSpotInGrid(node, { x: requested.x, y: requested.y + 4 });
      }
      return this.reserveSpotInGrid(node, { x: requested.x + 4, y: requested.y });
    }
    for (let x = 0; x < 3; x += 1) {
      for (let y = 0; y < 3; y += 1) {
        const reserved = { x: requested.x + x, y: requested.y + y };
        this.grid.set(gridKey(reserved), node);
      }
    }
    return requested;
  }

  setColumnWidth(node: Node): void {
    if (!node.gridCoord) return;
    const col1 = 1;
    const col2 = 2 * this.boxBorderPadding + stringWidth(node.name);
    const col3 = 1;
    const cols = [col1, col2, col3];
    const rows = [1, 1 + 2 * this.boxBorderPadding, 1];

    for (let idx = 0; idx < cols.length; idx += 1) {
      const xCoord = node.gridCoord.x + idx;
      this.setColumnWidthValue(xCoord, max(this.getColumnWidth(xCoord), cols[idx]));
    }

    for (let idx = 0; idx < rows.length; idx += 1) {
      const yCoord = node.gridCoord.y + idx;
      this.setRowHeightValue(yCoord, max(this.getRowHeight(yCoord), rows[idx]));
    }

    if (node.gridCoord.x > 0) {
      this.setColumnWidthValue(node.gridCoord.x - 1, this.paddingX);
    }

    if (node.gridCoord.y > 0) {
      let basePadding = this.paddingY;
      if (this.hasIncomingEdgeFromOutsideSubgraph(node)) {
        basePadding += 4;
      }
      this.setRowHeightValue(node.gridCoord.y - 1, max(this.getRowHeight(node.gridCoord.y - 1), basePadding));
    }
  }

  increaseGridSizeForPath(path: GridCoord[]): void {
    for (const coord of path) {
      if (!this.columnWidth.has(coord.x)) {
        this.setColumnWidthValue(coord.x, Math.floor(this.paddingX / 2));
      }
      if (!this.rowHeight.has(coord.y)) {
        this.setRowHeightValue(coord.y, Math.floor(this.paddingY / 2));
      }
    }
  }

  determinePath(edge: Edge): void {
    const [preferredDir, preferredOpposite, alternativeDir, alternativeOpposite] = determineStartAndEndDir(
      edge,
      this.graphDirection
    );

    let preferredPath: GridCoord[] = [];
    let alternativePath: GridCoord[] = [];

    let from = gridDirection(edge.from.gridCoord!, preferredDir);
    let to = gridDirection(edge.to.gridCoord!, preferredOpposite);

    preferredPath = this.getPath(from, to) ?? [];
    preferredPath = mergePath(preferredPath);

    from = gridDirection(edge.from.gridCoord!, alternativeDir);
    to = gridDirection(edge.to.gridCoord!, alternativeOpposite);
    alternativePath = this.getPath(from, to) ?? [];
    alternativePath = mergePath(alternativePath);

    if (preferredPath.length === 0 && alternativePath.length === 0) {
      edge.startDir = preferredDir;
      edge.endDir = preferredOpposite;
      edge.path = [];
      return;
    }

    if (alternativePath.length === 0 || preferredPath.length <= alternativePath.length) {
      edge.startDir = preferredDir;
      edge.endDir = preferredOpposite;
      edge.path = preferredPath;
    } else {
      edge.startDir = alternativeDir;
      edge.endDir = alternativeOpposite;
      edge.path = alternativePath;
    }
  }

  determineLabelLine(edge: Edge): void {
    const labelLength = stringWidth(edge.text);
    if (labelLength === 0 || edge.path.length < 2) return;

    let prev = edge.path[0];
    let largestLine: GridCoord[] = [edge.path[0], edge.path[1]];
    let largestSize = 0;
    for (const step of edge.path.slice(1)) {
      const line = [prev, step];
      const lineWidth = this.calculateLineWidth(line);
      if (lineWidth >= labelLength) {
        largestLine = line;
        break;
      }
      if (lineWidth > largestSize) {
        largestSize = lineWidth;
        largestLine = line;
      }
      prev = step;
    }

    const [a, b] = largestLine;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const middleX = minX + Math.floor((maxX - minX) / 2);
    const current = this.getColumnWidth(middleX);
    this.setColumnWidthValue(middleX, max(current, labelLength + 2));
    edge.labelLine = largestLine;
  }

  calculateLineWidth(line: GridCoord[]): number {
    let total = 0;
    for (const coord of line) {
      total += this.getColumnWidth(coord.x);
    }
    return total;
  }

  isFreeInGrid(coord: GridCoord): boolean {
    if (coord.x < 0 || coord.y < 0) return false;
    return !this.grid.has(gridKey(coord));
  }

  getPath(from: GridCoord, to: GridCoord): GridCoord[] | null {
    const heap = new MinHeap();
    heap.push({ coord: from, priority: 0 });

    const costSoFar = new Map<string, number>();
    const cameFrom = new Map<string, GridCoord | null>();
    costSoFar.set(gridKey(from), 0);
    cameFrom.set(gridKey(from), null);

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    while (heap.size() > 0) {
      const current = heap.pop()!.coord;
      if (gridEquals(current, to)) {
        const path: GridCoord[] = [];
        let cursor: GridCoord | null = current;
        while (cursor) {
          path.unshift(cursor);
          cursor = cameFrom.get(gridKey(cursor)) ?? null;
        }
        return path;
      }

      for (const dir of dirs) {
        const next = { x: current.x + dir.x, y: current.y + dir.y };
        if (!this.isFreeInGrid(next) && !gridEquals(next, to)) continue;
        const newCost = (costSoFar.get(gridKey(current)) ?? 0) + 1;
        const existing = costSoFar.get(gridKey(next));
        if (existing === undefined || newCost < existing) {
          costSoFar.set(gridKey(next), newCost);
          const priority = newCost + heuristic(next, to);
          heap.push({ coord: next, priority });
          cameFrom.set(gridKey(next), current);
        }
      }
    }
    return null;
  }

  draw(): Drawing {
    this.drawSubgraphs();
    for (const node of this.nodes) {
      if (!node.drawn) {
        this.drawNode(node);
      }
    }

    const lineDrawings: Drawing[] = [];
    const cornerDrawings: Drawing[] = [];
    const arrowHeadDrawings: Drawing[] = [];
    const boxStartDrawings: Drawing[] = [];
    const labelDrawings: Drawing[] = [];

    for (const edge of this.edges) {
      const { line, boxStart, arrowHead, corners, label } = this.drawEdge(edge);
      if (line) lineDrawings.push(line);
      if (boxStart) boxStartDrawings.push(boxStart);
      if (arrowHead) arrowHeadDrawings.push(arrowHead);
      if (corners) cornerDrawings.push(corners);
      if (label) labelDrawings.push(label);
    }

    this.drawing = this.mergeDrawings(this.drawing, { x: 0, y: 0 }, ...lineDrawings);
    this.drawing = this.mergeDrawings(this.drawing, { x: 0, y: 0 }, ...cornerDrawings);
    this.drawing = this.mergeDrawings(this.drawing, { x: 0, y: 0 }, ...arrowHeadDrawings);
    this.drawing = this.mergeDrawings(this.drawing, { x: 0, y: 0 }, ...boxStartDrawings);
    this.drawing = this.mergeDrawings(this.drawing, { x: 0, y: 0 }, ...labelDrawings);

    this.drawSubgraphLabels();

    return this.drawing;
  }

  drawNode(node: Node): void {
    if (!node.drawing || !node.drawingCoord) return;
    this.drawing = this.mergeDrawings(this.drawing, node.drawingCoord, node.drawing);
  }

  drawEdge(edge: Edge) {
    if (!edge.path.length) {
      return { line: null, boxStart: null, arrowHead: null, corners: null, label: null };
    }
    const line = this.drawPath(edge.path);
    const boxStart = this.drawBoxStart(edge.path, line.linesDrawn[0]);
    const arrowHead = this.drawArrowHead(line.linesDrawn[line.linesDrawn.length - 1], line.lineDirs[line.lineDirs.length - 1]);
    const corners = this.drawCorners(edge.path);
    const label = this.drawArrowLabel(edge);
    return { line: line.drawing, boxStart, arrowHead, corners, label };
  }

  drawPath(path: GridCoord[]) {
    const d = copyCanvas(this.drawing);
    const linesDrawn: DrawingCoord[][] = [];
    const lineDirs: Direction[] = [];
    let previous = path[0];
    for (const next of path.slice(1)) {
      const previousDrawing = this.gridToDrawingCoord(previous);
      const nextDrawing = this.gridToDrawingCoord(next);
      if (drawingEquals(previousDrawing, nextDrawing)) {
        previous = next;
        continue;
      }
      const dir = determineDirection(previous, next);
      let drawn = this.drawLine(d, previousDrawing, nextDrawing, 1, -1);
      if (drawn.length === 0) {
        drawn = [previousDrawing];
      }
      linesDrawn.push(drawn);
      lineDirs.push(dir);
      previous = next;
    }
    return { drawing: d, linesDrawn, lineDirs };
  }

  drawLine(d: Drawing, from: DrawingCoord, to: DrawingCoord, offsetFrom: number, offsetTo: number): DrawingCoord[] {
    const drawn: DrawingCoord[] = [];
    const dir = determineDirection(from, to);

    const draw = (coord: DrawingCoord, char: string) => {
      ensureSize(d, coord.x, coord.y);
      d[coord.x][coord.y] = char;
    };

    const lineChar = this.useAscii ? "-" : "─";
    const vertChar = this.useAscii ? "|" : "│";

    if (!this.useAscii) {
      switch (dir) {
        case directions.up:
          for (let y = from.y - offsetFrom; y >= to.y - offsetTo; y -= 1) {
            drawn.push({ x: from.x, y });
            draw({ x: from.x, y }, vertChar);
          }
          break;
        case directions.down:
          for (let y = from.y + offsetFrom; y <= to.y + offsetTo; y += 1) {
            drawn.push({ x: from.x, y });
            draw({ x: from.x, y }, vertChar);
          }
          break;
        case directions.left:
          for (let x = from.x - offsetFrom; x >= to.x - offsetTo; x -= 1) {
            drawn.push({ x, y: from.y });
            draw({ x, y: from.y }, lineChar);
          }
          break;
        case directions.right:
          for (let x = from.x + offsetFrom; x <= to.x + offsetTo; x += 1) {
            drawn.push({ x, y: from.y });
            draw({ x, y: from.y }, lineChar);
          }
          break;
        case directions.upperLeft:
          for (let x = from.x, y = from.y - offsetFrom; x >= to.x - offsetTo && y >= to.y - offsetTo; x -= 1, y -= 1) {
            drawn.push({ x, y });
            draw({ x, y }, "╲");
          }
          break;
        case directions.upperRight:
          for (let x = from.x, y = from.y - offsetFrom; x <= to.x + offsetTo && y >= to.y - offsetTo; x += 1, y -= 1) {
            drawn.push({ x, y });
            draw({ x, y }, "╱");
          }
          break;
        case directions.lowerLeft:
          for (let x = from.x, y = from.y + offsetFrom; x >= to.x - offsetTo && y <= to.y + offsetTo; x -= 1, y += 1) {
            drawn.push({ x, y });
            draw({ x, y }, "╱");
          }
          break;
        case directions.lowerRight:
          for (let x = from.x, y = from.y + offsetFrom; x <= to.x + offsetTo && y <= to.y + offsetTo; x += 1, y += 1) {
            drawn.push({ x, y });
            draw({ x, y }, "╲");
          }
          break;
        default:
          break;
      }
    } else {
      switch (dir) {
        case directions.up:
          for (let y = from.y - offsetFrom; y >= to.y - offsetTo; y -= 1) {
            drawn.push({ x: from.x, y });
            draw({ x: from.x, y }, "|");
          }
          break;
        case directions.down:
          for (let y = from.y + offsetFrom; y <= to.y + offsetTo; y += 1) {
            drawn.push({ x: from.x, y });
            draw({ x: from.x, y }, "|");
          }
          break;
        case directions.left:
          for (let x = from.x - offsetFrom; x >= to.x - offsetTo; x -= 1) {
            drawn.push({ x, y: from.y });
            draw({ x, y: from.y }, "-");
          }
          break;
        case directions.right:
          for (let x = from.x + offsetFrom; x <= to.x + offsetTo; x += 1) {
            drawn.push({ x, y: from.y });
            draw({ x, y: from.y }, "-");
          }
          break;
        case directions.upperLeft:
          for (let x = from.x, y = from.y - offsetFrom; x >= to.x - offsetTo && y >= to.y - offsetTo; x -= 1, y -= 1) {
            drawn.push({ x, y });
            draw({ x, y }, "\\");
          }
          break;
        case directions.upperRight:
          for (let x = from.x, y = from.y - offsetFrom; x <= to.x + offsetTo && y >= to.y - offsetTo; x += 1, y -= 1) {
            drawn.push({ x, y });
            draw({ x, y }, "/");
          }
          break;
        case directions.lowerLeft:
          for (let x = from.x, y = from.y + offsetFrom; x >= to.x - offsetTo && y <= to.y + offsetTo; x -= 1, y += 1) {
            drawn.push({ x, y });
            draw({ x, y }, "/");
          }
          break;
        case directions.lowerRight:
          for (let x = from.x, y = from.y + offsetFrom; x <= to.x + offsetTo && y <= to.y + offsetTo; x += 1, y += 1) {
            drawn.push({ x, y });
            draw({ x, y }, "\\");
          }
          break;
        default:
          break;
      }
    }

    return drawn;
  }

  drawBoxStart(path: GridCoord[], firstLine: DrawingCoord[]): Drawing | null {
    const d = copyCanvas(this.drawing);
    if (this.useAscii) return d;
    const from = firstLine[0];
    const dir = determineDirection(path[0], path[1]);

    switch (dir) {
      case directions.up:
        d[from.x][from.y + 1] = "┴";
        break;
      case directions.down:
        d[from.x][from.y - 1] = "┬";
        break;
      case directions.left:
        d[from.x + 1][from.y] = "┤";
        break;
      case directions.right:
        d[from.x - 1][from.y] = "├";
        break;
      default:
        break;
    }
    return d;
  }

  drawArrowHead(line: DrawingCoord[], fallback: Direction): Drawing | null {
    const d = copyCanvas(this.drawing);
    if (line.length === 0) return d;

    const from = line[0];
    const last = line[line.length - 1];
    let dir = determineDirection(from, last);
    if (line.length === 1 || dir === directions.middle) {
      dir = fallback;
    }

    let char = "";
    if (!this.useAscii) {
      switch (dir) {
        case directions.up:
          char = "▲";
          break;
        case directions.down:
          char = "▼";
          break;
        case directions.left:
          char = "◄";
          break;
        case directions.right:
          char = "►";
          break;
        case directions.upperRight:
          char = "◥";
          break;
        case directions.upperLeft:
          char = "◤";
          break;
        case directions.lowerRight:
          char = "◢";
          break;
        case directions.lowerLeft:
          char = "◣";
          break;
        default:
          char = "●";
      }
    } else {
      switch (dir) {
        case directions.up:
          char = "^";
          break;
        case directions.down:
          char = "v";
          break;
        case directions.left:
          char = "<";
          break;
        case directions.right:
          char = ">";
          break;
        default:
          char = "*";
      }
    }

    d[last.x][last.y] = char;
    return d;
  }

  drawCorners(path: GridCoord[]): Drawing | null {
    const d = copyCanvas(this.drawing);
    for (let idx = 0; idx < path.length; idx += 1) {
      if (idx === 0 || idx === path.length - 1) continue;
      const coord = path[idx];
      const drawingCoord = this.gridToDrawingCoord(coord);

      const prevDir = determineDirection(path[idx - 1], coord);
      const nextDir = determineDirection(coord, path[idx + 1]);
      let corner = "+";

      if (!this.useAscii) {
        if ((prevDir === directions.right && nextDir === directions.down) || (prevDir === directions.up && nextDir === directions.left)) {
          corner = "┐";
        } else if (
          (prevDir === directions.right && nextDir === directions.up) ||
          (prevDir === directions.down && nextDir === directions.left)
        ) {
          corner = "┘";
        } else if (
          (prevDir === directions.left && nextDir === directions.down) ||
          (prevDir === directions.up && nextDir === directions.right)
        ) {
          corner = "┌";
        } else if (
          (prevDir === directions.left && nextDir === directions.up) ||
          (prevDir === directions.down && nextDir === directions.right)
        ) {
          corner = "└";
        }
      }

      d[drawingCoord.x][drawingCoord.y] = corner;
    }
    return d;
  }

  drawArrowLabel(edge: Edge): Drawing | null {
    if (edge.text.length === 0 || edge.labelLine.length === 0) return null;
    const d = copyCanvas(this.drawing);
    dDrawTextOnLine(d, this.lineToDrawing(edge.labelLine), edge.text);
    return d;
  }

  drawSubgraphs(): void {
    const sorted = this.sortSubgraphsByDepth();
    for (const sg of sorted) {
      const sgDrawing = drawSubgraph(sg, this);
      const offset = { x: sg.minX, y: sg.minY };
      this.drawing = this.mergeDrawings(this.drawing, offset, sgDrawing);
    }
  }

  drawSubgraphLabels(): void {
    for (const sg of this.subgraphs) {
      if (sg.nodes.length === 0) continue;
      const { drawing, offset } = drawSubgraphLabel(sg, this);
      this.drawing = this.mergeDrawings(this.drawing, offset, drawing);
    }
  }

  sortSubgraphsByDepth(): Subgraph[] {
    const depths = new Map<Subgraph, number>();
    for (const sg of this.subgraphs) {
      depths.set(sg, this.getSubgraphDepth(sg));
    }
    const sorted = [...this.subgraphs];
    sorted.sort((a, b) => (depths.get(a) ?? 0) - (depths.get(b) ?? 0));
    return sorted;
  }

  getSubgraphDepth(sg: Subgraph): number {
    if (!sg.parent) return 0;
    return 1 + this.getSubgraphDepth(sg.parent);
  }

  getChildren(node: Node): Node[] {
    const children: Node[] = [];
    for (const edge of this.edges) {
      if (edge.from.name === node.name) {
        children.push(edge.to);
      }
    }
    return children;
  }

  gridToDrawingCoord(coord: GridCoord): DrawingCoord {
    let x = 0;
    let y = 0;
    for (let column = 0; column < coord.x; column += 1) {
      x += this.getColumnWidth(column);
    }
    for (let row = 0; row < coord.y; row += 1) {
      y += this.getRowHeight(row);
    }
    return {
      x: x + Math.floor(this.getColumnWidth(coord.x) / 2) + this.offsetX,
      y: y + Math.floor(this.getRowHeight(coord.y) / 2) + this.offsetY
    };
  }

  setDrawingSizeToGridConstraints(): void {
    let maxX = 0;
    let maxY = 0;
    for (const width of this.columnWidth.values()) {
      maxX += width;
    }
    for (const height of this.rowHeight.values()) {
      maxY += height;
    }
    this.drawing = ensureDrawingSize(this.drawing, maxX - 1, maxY - 1);
  }

  calculateSubgraphBoundingBoxes(): void {
    for (const sg of this.subgraphs) {
      this.calculateSubgraphBoundingBox(sg);
    }
    this.ensureSubgraphSpacing();
  }

  calculateSubgraphBoundingBox(sg: Subgraph): void {
    if (sg.nodes.length === 0) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const child of sg.children) {
      this.calculateSubgraphBoundingBox(child);
      if (child.nodes.length > 0) {
        minX = min(minX, child.minX);
        minY = min(minY, child.minY);
        maxX = max(maxX, child.maxX);
        maxY = max(maxY, child.maxY);
      }
    }

    for (const node of sg.nodes) {
      if (!node.drawingCoord || !node.drawing) continue;
      const nodeMinX = node.drawingCoord.x;
      const nodeMinY = node.drawingCoord.y;
      const nodeMaxX = nodeMinX + node.drawing.length - 1;
      const nodeMaxY = nodeMinY + node.drawing[0].length - 1;
      minX = min(minX, nodeMinX);
      minY = min(minY, nodeMinY);
      maxX = max(maxX, nodeMaxX);
      maxY = max(maxY, nodeMaxY);
    }

    const subgraphPadding = 2;
    const subgraphLabelSpace = 2;
    sg.minX = minX - subgraphPadding;
    sg.minY = minY - subgraphPadding - subgraphLabelSpace;
    sg.maxX = maxX + subgraphPadding;
    sg.maxY = maxY + subgraphPadding;
  }

  ensureSubgraphSpacing(): void {
    const minSpacing = 1;
    const rootSubgraphs = this.subgraphs.filter((sg) => !sg.parent && sg.nodes.length > 0);
    for (let i = 0; i < rootSubgraphs.length; i += 1) {
      for (let j = i + 1; j < rootSubgraphs.length; j += 1) {
        const sg1 = rootSubgraphs[i];
        const sg2 = rootSubgraphs[j];

        if (sg1.minX < sg2.maxX && sg1.maxX > sg2.minX) {
          if (sg1.maxY >= sg2.minY - minSpacing && sg1.minY < sg2.minY) {
            sg2.minY = sg1.maxY + minSpacing + 1;
          } else if (sg2.maxY >= sg1.minY - minSpacing && sg2.minY < sg1.minY) {
            sg1.minY = sg2.maxY + minSpacing + 1;
          }
        }

        if (sg1.minY < sg2.maxY && sg1.maxY > sg2.minY) {
          if (sg1.maxX >= sg2.minX - minSpacing && sg1.minX < sg2.minX) {
            sg2.minX = sg1.maxX + minSpacing + 1;
          } else if (sg2.maxX >= sg1.minX - minSpacing && sg2.minX < sg1.minX) {
            sg1.minX = sg2.maxX + minSpacing + 1;
          }
        }
      }
    }
  }

  offsetDrawingForSubgraphs(): void {
    if (this.subgraphs.length === 0) return;

    let minX = 0;
    let minY = 0;
    for (const sg of this.subgraphs) {
      minX = min(minX, sg.minX);
      minY = min(minY, sg.minY);
    }

    const offsetX = -minX;
    const offsetY = -minY;

    if (offsetX === 0 && offsetY === 0) return;

    this.offsetX = offsetX;
    this.offsetY = offsetY;

    for (const sg of this.subgraphs) {
      sg.minX += offsetX;
      sg.minY += offsetY;
      sg.maxX += offsetX;
      sg.maxY += offsetY;
    }

    for (const node of this.nodes) {
      if (node.drawingCoord) {
        node.drawingCoord.x += offsetX;
        node.drawingCoord.y += offsetY;
      }
    }
  }

  hasIncomingEdgeFromOutsideSubgraph(node: Node): boolean {
    const nodeSubgraph = this.getNodeSubgraph(node);
    if (!nodeSubgraph) return false;

    let hasExternal = false;
    for (const edge of this.edges) {
      if (edge.to === node) {
        const sourceSubgraph = this.getNodeSubgraph(edge.from);
        if (sourceSubgraph !== nodeSubgraph) {
          hasExternal = true;
          break;
        }
      }
    }

    if (!hasExternal) return false;

    for (const other of nodeSubgraph.nodes) {
      if (other === node || !other.gridCoord) continue;
      let otherHasExternal = false;
      for (const edge of this.edges) {
        if (edge.to === other) {
          const sourceSubgraph = this.getNodeSubgraph(edge.from);
          if (sourceSubgraph !== nodeSubgraph) {
            otherHasExternal = true;
            break;
          }
        }
      }
      if (otherHasExternal && other.gridCoord.y < (node.gridCoord?.y ?? 0)) {
        return false;
      }
    }

    return true;
  }

  getNodeSubgraph(node: Node): Subgraph | undefined {
    for (const sg of this.subgraphs) {
      if (sg.nodes.includes(node)) return sg;
    }
    return undefined;
  }

  isNodeInAnySubgraph(node: Node): boolean {
    return this.getNodeSubgraph(node) !== undefined;
  }

  lineToDrawing(line: GridCoord[]): DrawingCoord[] {
    return line.map((coord) => this.gridToDrawingCoord(coord));
  }

  mergeDrawings(base: Drawing, mergeCoord: DrawingCoord, ...drawings: Drawing[]): Drawing {
    let maxX = base.length - 1;
    let maxY = base[0]?.length ? base[0].length - 1 : 0;

    for (const d of drawings) {
      maxX = max(maxX, d.length - 1 + mergeCoord.x);
      maxY = max(maxY, (d[0]?.length ?? 1) - 1 + mergeCoord.y);
    }

    const merged = mkDrawing(maxX, maxY);

    for (let x = 0; x <= maxX; x += 1) {
      for (let y = 0; y <= maxY; y += 1) {
        if (x < base.length && y < base[0].length) {
          merged[x][y] = base[x][y];
        }
      }
    }

    for (const d of drawings) {
      for (let x = 0; x < d.length; x += 1) {
        for (let y = 0; y < d[0].length; y += 1) {
          const char = d[x][y];
          if (char !== " ") {
            const current = merged[x + mergeCoord.x][y + mergeCoord.y];
            if (!this.useAscii && junctionChars.has(char) && junctionChars.has(current)) {
              merged[x + mergeCoord.x][y + mergeCoord.y] = mergeJunctions(current, char);
            } else {
              merged[x + mergeCoord.x][y + mergeCoord.y] = char;
            }
          }
        }
      }
    }

    return merged;
  }
}

type QueueItem = { coord: GridCoord; priority: number };

class MinHeap {
  items: QueueItem[] = [];

  size() {
    return this.items.length;
  }

  push(item: QueueItem) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): QueueItem | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const end = this.items.pop();
    if (this.items.length > 0 && end) {
      this.items[0] = end;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= this.items[index].priority) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  bubbleDown(index: number) {
    const length = this.items.length;
    while (true) {
      let left = 2 * index + 1;
      let right = left + 1;
      let smallest = index;

      if (left < length && this.items[left].priority < this.items[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.items[right].priority < this.items[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

function heuristic(a: GridCoord, b: GridCoord): number {
  const absX = abs(a.x - b.x);
  const absY = abs(a.y - b.y);
  if (absX === 0 || absY === 0) {
    return absX + absY;
  }
  return absX + absY + 1;
}

function determineStartAndEndDir(edge: Edge, graphDirection: "LR" | "TD"): [Direction, Direction, Direction, Direction] {
  if (edge.from === edge.to) {
    if (graphDirection === "LR") {
      return [directions.right, directions.down, directions.down, directions.right];
    }
    return [directions.down, directions.right, directions.right, directions.down];
  }

  const d = determineDirection(edge.from.gridCoord!, edge.to.gridCoord!);
  let preferredDir = d;
  let preferredOpposite = directionOpposite(preferredDir);
  let alternativeDir = d;
  let alternativeOpposite = preferredOpposite;

  const isBackwards =
    graphDirection === "LR"
      ? d === directions.left || d === directions.upperLeft || d === directions.lowerLeft
      : d === directions.up || d === directions.upperLeft || d === directions.upperRight;

  switch (d) {
    case directions.lowerRight:
      if (graphDirection === "LR") {
        preferredDir = directions.down;
        preferredOpposite = directions.left;
        alternativeDir = directions.right;
        alternativeOpposite = directions.up;
      } else {
        preferredDir = directions.right;
        preferredOpposite = directions.up;
        alternativeDir = directions.down;
        alternativeOpposite = directions.left;
      }
      break;
    case directions.upperRight:
      if (graphDirection === "LR") {
        preferredDir = directions.up;
        preferredOpposite = directions.left;
        alternativeDir = directions.right;
        alternativeOpposite = directions.down;
      } else {
        preferredDir = directions.right;
        preferredOpposite = directions.down;
        alternativeDir = directions.up;
        alternativeOpposite = directions.left;
      }
      break;
    case directions.lowerLeft:
      if (graphDirection === "LR") {
        preferredDir = directions.down;
        preferredOpposite = directions.down;
        alternativeDir = directions.left;
        alternativeOpposite = directions.up;
      } else {
        preferredDir = directions.left;
        preferredOpposite = directions.up;
        alternativeDir = directions.down;
        alternativeOpposite = directions.right;
      }
      break;
    case directions.upperLeft:
      if (graphDirection === "LR") {
        preferredDir = directions.down;
        preferredOpposite = directions.down;
        alternativeDir = directions.left;
        alternativeOpposite = directions.down;
      } else {
        preferredDir = directions.right;
        preferredOpposite = directions.right;
        alternativeDir = directions.up;
        alternativeOpposite = directions.right;
      }
      break;
    default:
      if (isBackwards) {
        if (graphDirection === "LR" && d === directions.left) {
          preferredDir = directions.down;
          preferredOpposite = directions.down;
          alternativeDir = directions.left;
          alternativeOpposite = directions.right;
        } else if (graphDirection === "TD" && d === directions.up) {
          preferredDir = directions.right;
          preferredOpposite = directions.right;
          alternativeDir = directions.up;
          alternativeOpposite = directions.down;
        }
      }
  }

  return [preferredDir, preferredOpposite, alternativeDir, alternativeOpposite];
}

function mergePath(path: GridCoord[]): GridCoord[] {
  if (path.length <= 2) return path;
  const toRemove = new Set<number>();
  let step0 = path[0];
  let step1 = path[1];
  for (let idx = 0; idx < path.slice(2).length; idx += 1) {
    const step2 = path[idx + 2];
    const prevDir = determineDirection(step0, step1);
    const dir = determineDirection(step1, step2);
    if (prevDir === dir) {
      toRemove.add(idx + 1);
    }
    step0 = step1;
    step1 = step2;
  }
  return path.filter((_, idx) => !toRemove.has(idx));
}

function mergeJunctions(c1: string, c2: string): string {
  const map: Record<string, Record<string, string>> = {
    "─": { "│": "┼", "┌": "┬", "┐": "┬", "└": "┴", "┘": "┴", "├": "┼", "┤": "┼", "┬": "┬", "┴": "┴" },
    "│": { "─": "┼", "┌": "├", "┐": "┤", "└": "├", "┘": "┤", "├": "├", "┤": "┤", "┬": "┼", "┴": "┼" },
    "┌": { "─": "┬", "│": "├", "┐": "┬", "└": "├", "┘": "┼", "├": "├", "┤": "┼", "┬": "┬", "┴": "┼" },
    "┐": { "─": "┬", "│": "┤", "┌": "┬", "└": "┼", "┘": "┤", "├": "┼", "┤": "┤", "┬": "┬", "┴": "┼" },
    "└": { "─": "┴", "│": "├", "┌": "├", "┐": "┼", "┘": "┴", "├": "├", "┤": "┼", "┬": "┼", "┴": "┴" },
    "┘": { "─": "┴", "│": "┤", "┌": "┼", "┐": "┤", "└": "┴", "├": "┼", "┤": "┤", "┬": "┼", "┴": "┴" },
    "├": { "─": "┼", "│": "├", "┌": "├", "┐": "┼", "└": "├", "┘": "┼", "┤": "┼", "┬": "┼", "┴": "┼" },
    "┤": { "─": "┼", "│": "┤", "┌": "┼", "┐": "┤", "└": "┼", "┘": "┤", "├": "┼", "┬": "┼", "┴": "┼" },
    "┬": { "─": "┬", "│": "┼", "┌": "┬", "┐": "┬", "└": "┼", "┘": "┼", "├": "┼", "┤": "┼", "┴": "┼" },
    "┴": { "─": "┴", "│": "┼", "┌": "┼", "┐": "┼", "└": "┴", "┘": "┴", "├": "┼", "┤": "┼", "┬": "┼" }
  };

  return map[c1]?.[c2] ?? c1;
}

function mkDrawing(x: number, y: number): Drawing {
  const drawing: Drawing = [];
  for (let i = 0; i <= x; i += 1) {
    drawing[i] = [];
    for (let j = 0; j <= y; j += 1) {
      drawing[i][j] = " ";
    }
  }
  return drawing;
}

function ensureSize(d: Drawing, x: number, y: number): void {
  while (d.length <= x) {
    d.push([]);
  }
  for (let i = 0; i < d.length; i += 1) {
    if (!d[i]) d[i] = [];
    while (d[i].length <= y) {
      d[i].push(" ");
    }
  }
}

function ensureDrawingSize(d: Drawing, x: number, y: number): Drawing {
  const width = max(x, d.length - 1);
  const height = max(y, d[0]?.length ? d[0].length - 1 : 0);
  const resized = mkDrawing(width, height);
  for (let i = 0; i < d.length; i += 1) {
    for (let j = 0; j < d[0].length; j += 1) {
      resized[i][j] = d[i][j];
    }
  }
  return resized;
}

function copyCanvas(d: Drawing): Drawing {
  return mkDrawing(d.length - 1, d[0].length - 1);
}

function drawingToString(d: Drawing): string {
  const maxX = d.length - 1;
  const maxY = d[0].length - 1;
  let result = "";
  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      result += d[x][y];
    }
    if (y !== maxY) result += "\n";
  }
  return result;
}

function drawBox(node: Node, graph: Graph): Drawing {
  if (!node.gridCoord) return mkDrawing(0, 0);
  let w = 0;
  let h = 0;
  for (let i = 0; i < 2; i += 1) {
    w += graph.getColumnWidth(node.gridCoord.x + i);
    h += graph.getRowHeight(node.gridCoord.y + i);
  }

  const from = { x: 0, y: 0 };
  const to = { x: w, y: h };
  const box = mkDrawing(max(from.x, to.x), max(from.y, to.y));

  const horizontal = graph.useAscii ? "-" : "─";
  const vertical = graph.useAscii ? "|" : "│";
  const topLeft = graph.useAscii ? "+" : "┌";
  const topRight = graph.useAscii ? "+" : "┐";
  const bottomLeft = graph.useAscii ? "+" : "└";
  const bottomRight = graph.useAscii ? "+" : "┘";

  for (let x = from.x + 1; x < to.x; x += 1) {
    box[x][from.y] = horizontal;
    box[x][to.y] = horizontal;
  }
  for (let y = from.y + 1; y < to.y; y += 1) {
    box[from.x][y] = vertical;
    box[to.x][y] = vertical;
  }
  box[from.x][from.y] = topLeft;
  box[to.x][from.y] = topRight;
  box[from.x][to.y] = bottomLeft;
  box[to.x][to.y] = bottomRight;

  const textY = from.y + Math.floor(h / 2);
  const label = node.name;
  const labelWidth = stringWidth(label);
  const textX = from.x + Math.floor(w / 2) - ceilDiv(labelWidth, 2) + 1;
  const chars = Array.from(label);

  for (let i = 0; i < chars.length; i += 1) {
    box[textX + i][textY] = wrapTextInColor(chars[i], node.styleClass.styles["color"], graph.styleType);
  }

  return box;
}

function drawSubgraph(sg: Subgraph, graph: Graph): Drawing {
  const width = sg.maxX - sg.minX;
  const height = sg.maxY - sg.minY;
  if (width <= 0 || height <= 0) return mkDrawing(0, 0);

  const from = { x: 0, y: 0 };
  const to = { x: width, y: height };
  const subgraph = mkDrawing(width, height);

  const horizontal = graph.useAscii ? "-" : "─";
  const vertical = graph.useAscii ? "|" : "│";
  const topLeft = graph.useAscii ? "+" : "┌";
  const topRight = graph.useAscii ? "+" : "┐";
  const bottomLeft = graph.useAscii ? "+" : "└";
  const bottomRight = graph.useAscii ? "+" : "┘";

  for (let x = from.x + 1; x < to.x; x += 1) {
    subgraph[x][from.y] = horizontal;
    subgraph[x][to.y] = horizontal;
  }
  for (let y = from.y + 1; y < to.y; y += 1) {
    subgraph[from.x][y] = vertical;
    subgraph[to.x][y] = vertical;
  }
  subgraph[from.x][from.y] = topLeft;
  subgraph[to.x][from.y] = topRight;
  subgraph[from.x][to.y] = bottomLeft;
  subgraph[to.x][to.y] = bottomRight;

  return subgraph;
}

function drawSubgraphLabel(sg: Subgraph, graph: Graph) {
  const width = sg.maxX - sg.minX;
  const height = sg.maxY - sg.minY;
  if (width <= 0 || height <= 0) {
    return { drawing: mkDrawing(0, 0), offset: { x: 0, y: 0 } };
  }

  const drawing = mkDrawing(width, height);
  const labelY = 1;
  let labelX = Math.floor(width / 2) - Math.floor(stringWidth(sg.name) / 2);
  if (labelX < 1) labelX = 1;

  const chars = Array.from(sg.name);
  for (let i = 0; i < chars.length; i += 1) {
    if (labelX + i < width) {
      drawing[labelX + i][labelY] = chars[i];
    }
  }

  return { drawing, offset: { x: sg.minX, y: sg.minY } };
}

function wrapTextInColor(text: string, color: string | undefined, styleType: "cli" | "html"): string {
  if (!color) return text;
  if (styleType === "html") {
    return `<span style='color: ${color}'>${text}</span>`;
  }
  const rgb = parseHexColor(color);
  if (!rgb) return text;
  return `\u001b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\u001b[0m`;
}

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("#")) return null;
  const hex = trimmed.slice(1);
  if (hex.length === 3) {
    const r = Number.parseInt(hex[0] + hex[0], 16);
    const g = Number.parseInt(hex[1] + hex[1], 16);
    const b = Number.parseInt(hex[2] + hex[2], 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  return null;
}

function dDrawTextOnLine(d: Drawing, line: DrawingCoord[], label: string) {
  if (line.length < 2) return;
  let minX = Math.min(line[0].x, line[1].x);
  let maxX = Math.max(line[0].x, line[1].x);
  let minY = Math.min(line[0].y, line[1].y);
  let maxY = Math.max(line[0].y, line[1].y);
  const middleX = minX + Math.floor((maxX - minX) / 2);
  const middleY = minY + Math.floor((maxY - minY) / 2);
  const start = { x: middleX - Math.floor(stringWidth(label) / 2), y: middleY };
  drawText(d, start, label);
}

function drawText(d: Drawing, start: DrawingCoord, text: string) {
  ensureSize(d, start.x + stringWidth(text), start.y);
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 1) {
    d[start.x + i][start.y] = chars[i];
  }
}

function drawingWithCoordsWrapper(d: Drawing): Drawing {
  const maxX = d.length - 1;
  const maxY = d[0].length - 1;
  const debug = mkDrawing(maxX + 2, maxY + 1);
  for (let x = 0; x <= maxX; x += 1) {
    debug[x + 2][0] = String(x % 10);
  }
  for (let y = 0; y <= maxY; y += 1) {
    debug[0][y + 1] = String(y % 10).padStart(2, " ");
  }
  for (let x = 0; x < debug.length; x += 1) {
    for (let y = 0; y < debug[0].length; y += 1) {
      if (x >= 2 && y >= 1 && x - 2 < d.length && y - 1 < d[0].length) {
        debug[x][y] = d[x - 2][y - 1];
      }
    }
  }
  return debug;
}

function drawingCoordWrapper(d: Drawing, graph: Graph): Drawing {
  const maxX = d.length - 1;
  const maxY = d[0].length - 1;
  const debug = mkDrawing(maxX + 2, maxY + 1);
  let currX = 3;
  for (let x = 0; currX <= maxX + graph.getColumnWidth(x); x += 1) {
    const w = graph.getColumnWidth(x);
    const debugPos = currX;
    debug[debugPos][0] = String(x % 10);
    currX += w;
  }
  let currY = 2;
  for (let y = 0; currY <= maxY + graph.getRowHeight(y); y += 1) {
    const h = graph.getRowHeight(y);
    const debugPos = currY + Math.floor(h / 2);
    debug[0][debugPos] = String(y % 10);
    currY += h;
  }

  return graph.mergeDrawings(debug, { x: 1, y: 1 }, d);
}

function renderGraph(input: string, config: DiagramConfig): string {
  const logger = makeLogger(config.verbose);
  const props = mermaidFileToMap(input, config);
  const graph = new Graph(props, logger);
  graph.createMapping();
  let drawing = graph.draw();
  if (config.showCoords) {
    drawing = drawingWithCoordsWrapper(drawing);
    drawing = drawingCoordWrapper(drawing, graph);
  }
  return drawingToString(drawing);
}

function parseSequence(input: string): SequenceDiagram {
  const rawLines = splitLines(input);
  const lines = removeComments(rawLines);
  if (lines.length === 0) throw new Error("no content found");

  if (!lines[0].trim().startsWith(sequenceDiagramKeyword)) {
    throw new Error(`expected ${sequenceDiagramKeyword}`);
  }

  const sd: SequenceDiagram = { participants: [], messages: [], autonumber: false };
  const participantMap = new Map<string, Participant>();

  for (let i = 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;

    if (/^\s*autonumber\s*$/i.test(trimmed)) {
      sd.autonumber = true;
      continue;
    }

    if (parseParticipant(trimmed, sd, participantMap)) continue;
    if (parseMessage(trimmed, sd, participantMap)) continue;

    throw new Error(`line ${i + 1}: invalid syntax: ${trimmed}`);
  }

  if (sd.participants.length === 0) {
    throw new Error("no participants found");
  }
  return sd;
}

function parseParticipant(line: string, sd: SequenceDiagram, participants: Map<string, Participant>): boolean {
  const match = line.match(/^\s*participant\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(.+))?$/i);
  if (!match) return false;
  const id = match[1] || match[2];
  if (!id) return false;
  let label = match[3] || id;
  label = label.replace(/^"|"$/g, "");
  if (participants.has(id)) {
    throw new Error(`duplicate participant ${id}`);
  }
  const participant: Participant = { id, label, index: sd.participants.length };
  sd.participants.push(participant);
  participants.set(id, participant);
  return true;
}

function parseMessage(line: string, sd: SequenceDiagram, participants: Map<string, Participant>): boolean {
  const match = line.match(/^\s*(?:"([^"]+)"|([^\s\->]+))\s*(-->>|->>)\s*(?:"([^"]+)"|([^\s\->]+))\s*:\s*(.*)$/);
  if (!match) return false;

  const fromId = match[1] || match[2];
  const arrow = match[3];
  const toId = match[4] || match[5];
  const label = match[6]?.trim() ?? "";

  if (!fromId || !toId) return false;

  const from = getParticipant(fromId, sd, participants);
  const to = getParticipant(toId, sd, participants);

  const arrowType = arrow === solidArrowSyntax ? ArrowType.Solid : ArrowType.Dotted;
  const number = sd.autonumber ? sd.messages.length + 1 : 0;

  sd.messages.push({ from, to, label, arrowType, number });
  return true;
}

function getParticipant(id: string, sd: SequenceDiagram, participants: Map<string, Participant>): Participant {
  const existing = participants.get(id);
  if (existing) return existing;
  const participant: Participant = { id, label: id, index: sd.participants.length };
  sd.participants.push(participant);
  participants.set(id, participant);
  return participant;
}

function renderSequence(sd: SequenceDiagram, config: DiagramConfig): string {
  const chars = config.useAscii ? asciiChars : unicodeChars;
  const layout = calculateSequenceLayout(sd, config);
  const lines: string[] = [];

  lines.push(buildSequenceLine(sd.participants, layout, (i) => {
    return chars.topLeft + chars.horizontal.repeat(layout.participantWidths[i]) + chars.topRight;
  }));

  lines.push(buildSequenceLine(sd.participants, layout, (i) => {
    const w = layout.participantWidths[i];
    const labelLen = stringWidth(sd.participants[i].label);
    const pad = Math.floor((w - labelLen) / 2);
    return chars.vertical + " ".repeat(pad) + sd.participants[i].label + " ".repeat(w - pad - labelLen) + chars.vertical;
  }));

  lines.push(buildSequenceLine(sd.participants, layout, (i) => {
    const w = layout.participantWidths[i];
    return chars.bottomLeft + chars.horizontal.repeat(Math.floor(w / 2)) + chars.teeDown +
      chars.horizontal.repeat(w - Math.floor(w / 2) - 1) + chars.bottomRight;
  }));

  for (const msg of sd.messages) {
    for (let i = 0; i < layout.messageSpacing; i += 1) {
      lines.push(buildLifeline(layout, chars));
    }
    if (msg.from === msg.to) {
      lines.push(...renderSelfMessage(msg, layout, chars));
    } else {
      lines.push(...renderMessage(msg, layout, chars));
    }
  }

  lines.push(buildLifeline(layout, chars));
  return lines.join("\n") + "\n";
}

type SequenceLayout = {
  participantWidths: number[];
  participantCenters: number[];
  totalWidth: number;
  messageSpacing: number;
  selfMessageWidth: number;
};

function calculateSequenceLayout(sd: SequenceDiagram, config: DiagramConfig): SequenceLayout {
  const participantSpacing = config.sequenceParticipantSpacing || defaultConfig.sequenceParticipantSpacing;
  const widths = sd.participants.map((p) => {
    const w = stringWidth(p.label) + 2;
    return w < 3 ? 3 : w;
  });

  const centers: number[] = [];
  let currentX = 0;
  for (let i = 0; i < sd.participants.length; i += 1) {
    const boxWidth = widths[i] + 2;
    if (i === 0) {
      centers[i] = Math.floor(boxWidth / 2);
      currentX = boxWidth;
    } else {
      currentX += participantSpacing;
      centers[i] = currentX + Math.floor(boxWidth / 2);
      currentX += boxWidth;
    }
  }

  const last = sd.participants.length - 1;
  const totalWidth = centers[last] + Math.floor((widths[last] + 2) / 2);

  return {
    participantWidths: widths,
    participantCenters: centers,
    totalWidth,
    messageSpacing: config.sequenceMessageSpacing || defaultConfig.sequenceMessageSpacing,
    selfMessageWidth: config.sequenceSelfMessageWidth || defaultConfig.sequenceSelfMessageWidth
  };
}

function buildSequenceLine(participants: Participant[], layout: SequenceLayout, draw: (i: number) => string): string {
  let line = "";
  for (let i = 0; i < participants.length; i += 1) {
    const boxWidth = layout.participantWidths[i] + 2;
    const left = layout.participantCenters[i] - Math.floor(boxWidth / 2);
    const needed = left - stringWidth(line);
    if (needed > 0) {
      line += " ".repeat(needed);
    }
    line += draw(i);
  }
  return line;
}

function buildLifeline(layout: SequenceLayout, chars: BoxChars): string {
  const line = Array.from({ length: layout.totalWidth + 1 }, () => " ");
  for (const c of layout.participantCenters) {
    if (c < line.length) line[c] = chars.vertical;
  }
  return line.join("").replace(/\s+$/, "");
}

function renderMessage(msg: Message, layout: SequenceLayout, chars: BoxChars): string[] {
  const lines: string[] = [];
  const from = layout.participantCenters[msg.from.index];
  const to = layout.participantCenters[msg.to.index];

  let label = msg.label;
  if (msg.number > 0) {
    label = `${msg.number}. ${label}`;
  }

  if (label) {
    const start = min(from, to) + 2;
    const labelWidth = stringWidth(label);
    const w = max(layout.totalWidth, start + labelWidth) + 10;
    let line = buildLifeline(layout, chars);
    if (stringWidth(line) < w) {
      line = line + " ".repeat(w - stringWidth(line));
    }
    const arr = Array.from(line);
    let col = start;
    for (const r of Array.from(label)) {
      if (col < arr.length) {
        arr[col] = r;
        col += 1;
      }
    }
    lines.push(arr.join("").replace(/\s+$/, ""));
  }

  let line = Array.from(buildLifeline(layout, chars));
  const style = msg.arrowType === ArrowType.Dotted ? chars.dottedLine : chars.solidLine;

  if (from < to) {
    line[from] = chars.teeRight;
    for (let i = from + 1; i < to; i += 1) {
      line[i] = style;
    }
    line[to - 1] = chars.arrowRight;
    line[to] = chars.vertical;
  } else {
    line[to] = chars.vertical;
    line[to + 1] = chars.arrowLeft;
    for (let i = to + 2; i < from; i += 1) {
      line[i] = style;
    }
    line[from] = chars.teeLeft;
  }

  lines.push(line.join("").replace(/\s+$/, ""));
  return lines;
}

function renderSelfMessage(msg: Message, layout: SequenceLayout, chars: BoxChars): string[] {
  const lines: string[] = [];
  const center = layout.participantCenters[msg.from.index];
  const width = layout.selfMessageWidth;

  const ensureWidth = (line: string) => {
    const target = layout.totalWidth + width + 1;
    const arr = Array.from(line);
    if (arr.length < target) {
      arr.push(...Array.from({ length: target - arr.length }, () => " "));
    }
    return arr;
  };

  let label = msg.label;
  if (msg.number > 0) {
    label = `${msg.number}. ${label}`;
  }

  if (label) {
    let line = ensureWidth(buildLifeline(layout, chars));
    const start = center + 2;
    const labelWidth = stringWidth(label);
    const needed = start + labelWidth + 10;
    if (line.length < needed) {
      line.push(...Array.from({ length: needed - line.length }, () => " "));
    }
    let col = start;
    for (const c of Array.from(label)) {
      if (col < line.length) {
        line[col] = c;
        col += 1;
      }
    }
    lines.push(line.join("").replace(/\s+$/, ""));
  }

  const l1 = ensureWidth(buildLifeline(layout, chars));
  l1[center] = chars.teeRight;
  for (let i = 1; i < width; i += 1) {
    l1[center + i] = chars.horizontal;
  }
  l1[center + width - 1] = chars.selfTopRight;
  lines.push(l1.join("").replace(/\s+$/, ""));

  const l2 = ensureWidth(buildLifeline(layout, chars));
  l2[center + width - 1] = chars.vertical;
  lines.push(l2.join("").replace(/\s+$/, ""));

  const l3 = ensureWidth(buildLifeline(layout, chars));
  l3[center] = chars.vertical;
  l3[center + 1] = chars.arrowLeft;
  for (let i = 2; i < width - 1; i += 1) {
    l3[center + i] = chars.horizontal;
  }
  l3[center + width - 1] = chars.selfBottom;
  lines.push(l3.join("").replace(/\s+$/, ""));

  return lines;
}

function stringWidth(input: string): number {
  let width = 0;
  for (const char of Array.from(input)) {
    const codePoint = char.codePointAt(0) ?? 0;
    width += isFullwidthCodePoint(codePoint) ? 2 : 1;
  }
  return width;
}

function isFullwidthCodePoint(codePoint: number): boolean {
  if (codePoint >= 0x1100 && (
    codePoint <= 0x115f ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0x3247 && codePoint !== 0x303f) ||
    (codePoint >= 0x3250 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0xa4c6) ||
    (codePoint >= 0xa960 && codePoint <= 0xa97c) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6b) ||
    (codePoint >= 0xff01 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1b000 && codePoint <= 0x1b001) ||
    (codePoint >= 0x1f200 && codePoint <= 0x1f251) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )) {
    return true;
  }
  return false;
}

export function renderAscii(input: string, options: AsciiRenderOptions = {}): string | null {
  if (!input || input.trim() === "") return null;

  let config: DiagramConfig;
  try {
    config = normalizeConfig(options);
  } catch (error) {
    return null;
  }

  try {
    if (isSequenceDiagram(input)) {
      const sd = parseSequence(input);
      return renderSequence(sd, config);
    }

    return renderGraph(input, config);
  } catch (error) {
    return null;
  }
}
