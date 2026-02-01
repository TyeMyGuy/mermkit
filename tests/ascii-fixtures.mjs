export const asciiFixtures = [
  {
    name: "flowchart_tb_simple",
    input: `flowchart TB\n    A --> B\n    B --> C\n`,
    output: `+---+\n|   |\n| A |\n|   |\n+---+\n  |  \n  |  \n  |  \n  |  \n  v  \n+---+\n|   |\n| B |\n|   |\n+---+\n  |  \n  |  \n  |  \n  |  \n  v  \n+---+\n|   |\n| C |\n|   |\n+---+`
  },
  {
    name: "three_nodes_single_line",
    input: `graph LR\nA --> B --> C\n`,
    output: `+---+     +---+\n|   |     |   |\n| B |---->| C |\n|   |     |   |\n+---+     +---+\n            ^  \n            |  \n            |  \n            |  \n            |  \n+---+       |  \n|   |       |  \n| A |-------+  \n|   |          \n+---+`
  },
  {
    name: "two_layer_single_graph",
    input: `graph LR\nA --> B\nA --> C\n`,
    output: `+---+     +---+\n|   |     |   |\n| A |---->| B |\n|   |     |   |\n+---+     +---+\n  |            \n  |            \n  |            \n  |            \n  |            \n  |       +---+\n  |       |   |\n  +------>| C |\n          |   |\n          +---+`
  },
  {
    name: "comments",
    input: `graph LR\n%% This is a comment\nA --> B\n%% Another comment\nB --> C\nA --> C\n%% Final comment\n`,
    output: `+---+     +---+\n|   |     |   |\n| A |---->| B |\n|   |     |   |\n+---+     +---+\n  |         |  \n  |         |  \n  |         |  \n  |         |  \n  |         v  \n  |       +---+\n  |       |   |\n  +------>| C |\n          |   |\n          +---+`
  },
  {
    name: "subgraph_single_node",
    input: `graph LR\nsubgraph one\n    A\nend\n`,
    output: `+-------+\n|  one  |\n|       |\n|       |\n| +---+ |\n| |   | |\n| | A | |\n| |   | |\n| +---+ |\n|       |\n+-------+`
  }
];

export const sequenceFixtures = [
  {
    name: "three_participants",
    input: `sequenceDiagram\n    Alice->>Bob: Step 1\n    Bob->>Charlie: Step 2\n    Charlie-->>Alice: Done\n`,
    output: `+-------+     +-----+     +---------+\n| Alice |     | Bob |     | Charlie |\n+---+---+     +--+--+     +----+----+\n    |            |             |\n    | Step 1     |             |\n    +----------->|             |\n    |            |             |\n    |            | Step 2      |\n    |            +------------>|\n    |            |             |\n    | Done       |             |\n    |<.........................+\n    |            |             |`
  }
];
