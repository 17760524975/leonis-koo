/* 四巧板 v0.1 关卡数据 —— 由 tools/build_levels.js 生成，请勿手改
 * 坐标系：1000×1000 归一化（拼图区内部坐标系）
 * 板件几何单位为 u，1u = 130 世界单位
 * 每关 outline 均由求解器枚举「四块边对边贴合」得到并校验：
 *   覆盖率 ≥99%、重叠 <1%、面积误差 <0.1%
 * v0.8：由 120 关精简为 30 关（tools/trim_levels4.js 重新抽样生成）
 * 1-2 关保留原最简单的两关，3..30 关取自原 61..120（最难半段）等距抽样；每 10 关一章
 */
(function (root) {
  var DATASET = {
    id: 'tangram4',
    name: '四巧板',
    unitScale: 130,
    pieceOrder: ['A', 'B', 'C', 'D'],
    pieces: {
      A: { id: 'A', name: '大梯形',   color: '#FF8A5B', stroke: '#D96A3D', area: 2.5,
           base: [[3,0],[0,0],[1,1],[3,1]] },
      B: { id: 'B', name: '小三角',   color: '#4FA8E0', stroke: '#3585BC', area: 0.5,
           base: [[0,1],[0,0],[1,1]] },
      C: { id: 'C', name: '小梯形',   color: '#63C88B', stroke: '#46A66D', area: 1,
           base: [[0,0],[1.5,0],[0.5,1],[0,1]] },
      D: { id: 'D', name: '燕尾块',   color: '#A87BE8', stroke: '#8455CC', area: 2,
           base: [[0.5,0],[0.5,1],[0,1],[1,2],[2.5,2]],
           mark: {"from":[0.5,1],"to":[0.25,1.25]} }
    }
  };

  var LEVELS = [
    {
      "id": 1,
      "chapter": 1,
      "name": "平行四边形",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          175,
          370
        ],
        [
          565,
          370
        ],
        [
          825,
          630
        ],
        [
          435,
          630
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 400.33,
          "y": 430.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 648.96,
          "y": 537.92,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 543.33,
          "y": 586.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 429.58,
          "y": 554.17,
          "angle": 0,
          "flipped": true
        }
      ],
      "parTime": 78,
      "parSteps": 15,
      "needFlip": true
    },
    {
      "id": 2,
      "chapter": 1,
      "name": "",
      "tip": "凹角只有一种填法，先解决它",
      "outline": [
        [
          792.5,
          370
        ],
        [
          792.5,
          500
        ],
        [
          662.5,
          500
        ],
        [
          662.5,
          630
        ],
        [
          467.5,
          630
        ],
        [
          207.5,
          370
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 627.83,
          "y": 430.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 383.54,
          "y": 462.08,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 510.83,
          "y": 586.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 592.08,
          "y": 554.17,
          "angle": 0,
          "flipped": true
        }
      ],
      "parTime": 81,
      "parSteps": 16
    },
    {
      "id": 3,
      "chapter": 1,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          207.5,
          565
        ],
        [
          597.5,
          565
        ],
        [
          467.5,
          435
        ],
        [
          532.5,
          435
        ],
        [
          532.5,
          305
        ],
        [
          792.5,
          565
        ],
        [
          662.5,
          695
        ],
        [
          207.5,
          695
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 432.83,
          "y": 625.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 250.83,
          "y": 651.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 667.92,
          "y": 619.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 616.46,
          "y": 472.92,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 88,
      "parSteps": 19
    },
    {
      "id": 4,
      "chapter": 1,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          175,
          337.5
        ],
        [
          565,
          337.5
        ],
        [
          825,
          597.5
        ],
        [
          630,
          597.5
        ],
        [
          500,
          467.5
        ],
        [
          305,
          467.5
        ],
        [
          305,
          532.5
        ],
        [
          175,
          662.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 400.33,
          "y": 398.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 218.33,
          "y": 424.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 229.17,
          "y": 537.92,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "D",
          "x": 648.96,
          "y": 505.42,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 90,
      "parSteps": 19
    },
    {
      "id": 5,
      "chapter": 1,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          175,
          305
        ],
        [
          565,
          305
        ],
        [
          825,
          565
        ],
        [
          695,
          695
        ],
        [
          630,
          695
        ],
        [
          630,
          565
        ],
        [
          500,
          565
        ],
        [
          500,
          435
        ],
        [
          305,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 400.33,
          "y": 365.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 648.96,
          "y": 472.92,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 543.33,
          "y": 521.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 700.42,
          "y": 619.17,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 93,
      "parSteps": 20
    },
    {
      "id": 6,
      "chapter": 1,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          207.5,
          565
        ],
        [
          597.5,
          565
        ],
        [
          467.5,
          435
        ],
        [
          532.5,
          435
        ],
        [
          402.5,
          305
        ],
        [
          532.5,
          305
        ],
        [
          792.5,
          565
        ],
        [
          662.5,
          695
        ],
        [
          337.5,
          695
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 432.83,
          "y": 625.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 667.92,
          "y": 619.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 616.46,
          "y": 472.92,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 489.17,
          "y": 348.33,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 94,
      "parSteps": 21
    },
    {
      "id": 7,
      "chapter": 1,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          370,
          370
        ],
        [
          760,
          370
        ],
        [
          760,
          500
        ],
        [
          630,
          500
        ],
        [
          630,
          565
        ],
        [
          500,
          695
        ],
        [
          240,
          435
        ],
        [
          240,
          305
        ],
        [
          370,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 595.33,
          "y": 430.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 407.92,
          "y": 518.96,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "B",
          "x": 283.33,
          "y": 391.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 554.17,
          "y": 570.42,
          "angle": 270,
          "flipped": true
        }
      ],
      "parTime": 97,
      "parSteps": 22,
      "needFlip": true
    },
    {
      "id": 8,
      "chapter": 1,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          727.5,
          305
        ],
        [
          727.5,
          435
        ],
        [
          467.5,
          435
        ],
        [
          597.5,
          565
        ],
        [
          532.5,
          565
        ],
        [
          662.5,
          695
        ],
        [
          532.5,
          695
        ],
        [
          272.5,
          435
        ],
        [
          272.5,
          305
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 562.83,
          "y": 365.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 342.92,
          "y": 380.83,
          "angle": 180,
          "flipped": true
        },
        {
          "id": "D",
          "x": 448.54,
          "y": 527.08,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 575.83,
          "y": 651.67,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 97,
      "parSteps": 22,
      "needFlip": true
    },
    {
      "id": 9,
      "chapter": 1,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          305,
          337.5
        ],
        [
          695,
          337.5
        ],
        [
          825,
          467.5
        ],
        [
          435,
          467.5
        ],
        [
          565,
          597.5
        ],
        [
          565,
          662.5
        ],
        [
          435,
          662.5
        ],
        [
          175,
          402.5
        ],
        [
          305,
          402.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 530.33,
          "y": 398.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 738.33,
          "y": 424.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 342.92,
          "y": 486.46,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "C",
          "x": 489.17,
          "y": 592.08,
          "angle": 270,
          "flipped": false
        }
      ],
      "parTime": 98,
      "parSteps": 22,
      "needFlip": true
    },
    {
      "id": 10,
      "chapter": 1,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          370,
          272.5
        ],
        [
          760,
          272.5
        ],
        [
          630,
          402.5
        ],
        [
          370,
          402.5
        ],
        [
          630,
          662.5
        ],
        [
          500,
          662.5
        ],
        [
          500,
          727.5
        ],
        [
          240,
          467.5
        ],
        [
          240,
          402.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 534.67,
          "y": 333.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 326.67,
          "y": 359.17,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "C",
          "x": 315.83,
          "y": 472.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 462.08,
          "y": 578.54,
          "angle": 90,
          "flipped": true
        }
      ],
      "parTime": 98,
      "parSteps": 22,
      "needFlip": true
    },
    {
      "id": 11,
      "chapter": 2,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          402.5,
          272.5
        ],
        [
          792.5,
          272.5
        ],
        [
          792.5,
          402.5
        ],
        [
          532.5,
          402.5
        ],
        [
          532.5,
          597.5
        ],
        [
          467.5,
          597.5
        ],
        [
          467.5,
          727.5
        ],
        [
          207.5,
          467.5
        ],
        [
          402.5,
          467.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 627.83,
          "y": 333.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 445.83,
          "y": 359.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 478.33,
          "y": 472.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 383.54,
          "y": 559.58,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 98,
      "parSteps": 22
    },
    {
      "id": 12,
      "chapter": 2,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          500,
          402.5
        ],
        [
          825,
          402.5
        ],
        [
          825,
          532.5
        ],
        [
          565,
          532.5
        ],
        [
          565,
          727.5
        ],
        [
          435,
          597.5
        ],
        [
          435,
          532.5
        ],
        [
          175,
          272.5
        ],
        [
          370,
          272.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 660.33,
          "y": 463.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 478.33,
          "y": 489.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 510.83,
          "y": 602.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 351.04,
          "y": 364.58,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 99,
      "parSteps": 22
    },
    {
      "id": 13,
      "chapter": 2,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          435,
          337.5
        ],
        [
          825,
          337.5
        ],
        [
          825,
          467.5
        ],
        [
          565,
          467.5
        ],
        [
          565,
          662.5
        ],
        [
          435,
          532.5
        ],
        [
          305,
          662.5
        ],
        [
          305,
          597.5
        ],
        [
          175,
          597.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 660.33,
          "y": 398.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 489.17,
          "y": 462.08,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "B",
          "x": 521.67,
          "y": 575.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "D",
          "x": 342.92,
          "y": 513.54,
          "angle": 270,
          "flipped": false
        }
      ],
      "parTime": 100,
      "parSteps": 23
    },
    {
      "id": 14,
      "chapter": 2,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          435,
          305
        ],
        [
          825,
          305
        ],
        [
          825,
          435
        ],
        [
          565,
          435
        ],
        [
          565,
          500
        ],
        [
          435,
          500
        ],
        [
          305,
          630
        ],
        [
          305,
          695
        ],
        [
          175,
          565
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 660.33,
          "y": 365.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 489.17,
          "y": 429.58,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "D",
          "x": 342.92,
          "y": 481.04,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "B",
          "x": 261.67,
          "y": 608.33,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 101,
      "parSteps": 23
    },
    {
      "id": 15,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          500,
          565
        ],
        [
          890,
          565
        ],
        [
          760,
          695
        ],
        [
          500,
          695
        ],
        [
          370,
          565
        ],
        [
          370,
          630
        ],
        [
          110,
          370
        ],
        [
          110,
          305
        ],
        [
          240,
          305
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 664.67,
          "y": 625.67,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 456.67,
          "y": 608.33,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "D",
          "x": 332.08,
          "y": 481.04,
          "angle": 90,
          "flipped": true
        },
        {
          "id": "C",
          "x": 185.83,
          "y": 375.42,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 101,
      "parSteps": 23,
      "needFlip": true
    },
    {
      "id": 16,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          305,
          272.5
        ],
        [
          695,
          272.5
        ],
        [
          695,
          597.5
        ],
        [
          630,
          597.5
        ],
        [
          630,
          727.5
        ],
        [
          370,
          467.5
        ],
        [
          565,
          467.5
        ],
        [
          565,
          402.5
        ],
        [
          305,
          402.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 469.67,
          "y": 333.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 651.67,
          "y": 359.17,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "C",
          "x": 640.83,
          "y": 472.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 546.04,
          "y": 559.58,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 102,
      "parSteps": 23,
      "needFlip": true
    },
    {
      "id": 17,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          175,
          435
        ],
        [
          565,
          435
        ],
        [
          565,
          240
        ],
        [
          825,
          500
        ],
        [
          695,
          500
        ],
        [
          695,
          760
        ],
        [
          565,
          630
        ],
        [
          565,
          565
        ],
        [
          305,
          565
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 400.33,
          "y": 495.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 608.33,
          "y": 521.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 640.83,
          "y": 635.42,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 657.08,
          "y": 416.04,
          "angle": 90,
          "flipped": true
        }
      ],
      "parTime": 103,
      "parSteps": 24,
      "needFlip": true
    },
    {
      "id": 18,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          207.5,
          305
        ],
        [
          662.5,
          305
        ],
        [
          792.5,
          435
        ],
        [
          662.5,
          435
        ],
        [
          792.5,
          565
        ],
        [
          727.5,
          565
        ],
        [
          727.5,
          695
        ],
        [
          467.5,
          435
        ],
        [
          207.5,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 372.17,
          "y": 365.67,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "C",
          "x": 592.08,
          "y": 380.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 705.83,
          "y": 391.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 643.54,
          "y": 527.08,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 103,
      "parSteps": 24,
      "needFlip": true
    },
    {
      "id": 19,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          142.5,
          402.5
        ],
        [
          597.5,
          402.5
        ],
        [
          597.5,
          272.5
        ],
        [
          857.5,
          532.5
        ],
        [
          662.5,
          532.5
        ],
        [
          662.5,
          597.5
        ],
        [
          532.5,
          727.5
        ],
        [
          532.5,
          532.5
        ],
        [
          272.5,
          532.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 367.83,
          "y": 463.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 575.83,
          "y": 489.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 586.67,
          "y": 602.92,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "D",
          "x": 681.46,
          "y": 440.42,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 104,
      "parSteps": 24,
      "needFlip": true
    },
    {
      "id": 20,
      "chapter": 2,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          305,
          435
        ],
        [
          695,
          435
        ],
        [
          695,
          240
        ],
        [
          825,
          370
        ],
        [
          825,
          435
        ],
        [
          695,
          565
        ],
        [
          435,
          565
        ],
        [
          435,
          760
        ],
        [
          175,
          500
        ],
        [
          305,
          500
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 530.33,
          "y": 495.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 738.33,
          "y": 478.33,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "C",
          "x": 749.17,
          "y": 364.58,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "D",
          "x": 342.92,
          "y": 583.96,
          "angle": 270,
          "flipped": true
        }
      ],
      "parTime": 104,
      "parSteps": 24,
      "needFlip": true
    },
    {
      "id": 21,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          435,
          305
        ],
        [
          825,
          305
        ],
        [
          825,
          500
        ],
        [
          695,
          500
        ],
        [
          695,
          435
        ],
        [
          435,
          435
        ],
        [
          175,
          695
        ],
        [
          175,
          500
        ],
        [
          305,
          370
        ],
        [
          305,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 599.67,
          "y": 365.67,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 391.67,
          "y": 391.67,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "C",
          "x": 770.83,
          "y": 429.58,
          "angle": 90,
          "flipped": true
        },
        {
          "id": "D",
          "x": 267.08,
          "y": 518.96,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 105,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 22,
      "chapter": 3,
      "name": "",
      "tip": "注意那两个凹角，它们是唯一解的关键",
      "outline": [
        [
          110,
          337.5
        ],
        [
          500,
          337.5
        ],
        [
          630,
          467.5
        ],
        [
          760,
          337.5
        ],
        [
          760,
          402.5
        ],
        [
          890,
          402.5
        ],
        [
          630,
          662.5
        ],
        [
          500,
          532.5
        ],
        [
          500,
          467.5
        ],
        [
          240,
          467.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 335.33,
          "y": 398.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 543.33,
          "y": 424.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 575.83,
          "y": 537.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 722.08,
          "y": 486.46,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 106,
      "parSteps": 25
    },
    {
      "id": 23,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          370,
          597.5
        ],
        [
          760,
          597.5
        ],
        [
          630,
          727.5
        ],
        [
          370,
          727.5
        ],
        [
          240,
          597.5
        ],
        [
          240,
          402.5
        ],
        [
          305,
          402.5
        ],
        [
          305,
          272.5
        ],
        [
          565,
          532.5
        ],
        [
          370,
          532.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 534.67,
          "y": 658.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 326.67,
          "y": 640.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "C",
          "x": 294.17,
          "y": 527.08,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "D",
          "x": 388.96,
          "y": 440.42,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 106,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 24,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          305,
          337.5
        ],
        [
          695,
          337.5
        ],
        [
          825,
          467.5
        ],
        [
          825,
          532.5
        ],
        [
          695,
          662.5
        ],
        [
          695,
          467.5
        ],
        [
          435,
          467.5
        ],
        [
          435,
          662.5
        ],
        [
          175,
          402.5
        ],
        [
          305,
          402.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 530.33,
          "y": 398.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 738.33,
          "y": 424.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 749.17,
          "y": 537.92,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "D",
          "x": 342.92,
          "y": 486.46,
          "angle": 270,
          "flipped": true
        }
      ],
      "parTime": 106,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 25,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          142.5,
          305
        ],
        [
          597.5,
          305
        ],
        [
          727.5,
          435
        ],
        [
          857.5,
          435
        ],
        [
          857.5,
          565
        ],
        [
          792.5,
          565
        ],
        [
          792.5,
          695
        ],
        [
          532.5,
          435
        ],
        [
          272.5,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 367.83,
          "y": 365.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 602.92,
          "y": 380.83,
          "angle": 180,
          "flipped": true
        },
        {
          "id": "D",
          "x": 708.54,
          "y": 527.08,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 814.17,
          "y": 478.33,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 107,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 26,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          435,
          272.5
        ],
        [
          825,
          272.5
        ],
        [
          825,
          402.5
        ],
        [
          565,
          402.5
        ],
        [
          565,
          467.5
        ],
        [
          435,
          597.5
        ],
        [
          500,
          597.5
        ],
        [
          370,
          727.5
        ],
        [
          175,
          727.5
        ],
        [
          435,
          467.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 660.33,
          "y": 333.17,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 489.17,
          "y": 397.08,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "B",
          "x": 478.33,
          "y": 510.83,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 351.04,
          "y": 635.42,
          "angle": 0,
          "flipped": true
        }
      ],
      "parTime": 107,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 27,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          467.5,
          272.5
        ],
        [
          857.5,
          272.5
        ],
        [
          727.5,
          402.5
        ],
        [
          467.5,
          402.5
        ],
        [
          467.5,
          597.5
        ],
        [
          402.5,
          597.5
        ],
        [
          402.5,
          727.5
        ],
        [
          142.5,
          467.5
        ],
        [
          337.5,
          467.5
        ],
        [
          337.5,
          402.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 632.17,
          "y": 333.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "B",
          "x": 424.17,
          "y": 359.17,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "C",
          "x": 413.33,
          "y": 472.92,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 318.54,
          "y": 559.58,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 108,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 28,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          467.5,
          370
        ],
        [
          857.5,
          370
        ],
        [
          857.5,
          500
        ],
        [
          597.5,
          500
        ],
        [
          597.5,
          695
        ],
        [
          337.5,
          435
        ],
        [
          272.5,
          435
        ],
        [
          142.5,
          305
        ],
        [
          337.5,
          305
        ],
        [
          467.5,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 692.83,
          "y": 430.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 505.42,
          "y": 518.96,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "B",
          "x": 380.83,
          "y": 391.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 267.08,
          "y": 359.17,
          "angle": 0,
          "flipped": true
        }
      ],
      "parTime": 109,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 29,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          110,
          305
        ],
        [
          500,
          305
        ],
        [
          630,
          435
        ],
        [
          630,
          370
        ],
        [
          760,
          500
        ],
        [
          890,
          500
        ],
        [
          890,
          565
        ],
        [
          760,
          695
        ],
        [
          500,
          435
        ],
        [
          240,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 335.33,
          "y": 365.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "B",
          "x": 543.33,
          "y": 391.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "D",
          "x": 667.92,
          "y": 518.96,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "C",
          "x": 814.17,
          "y": 570.42,
          "angle": 270,
          "flipped": true
        }
      ],
      "parTime": 109,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 30,
      "chapter": 3,
      "name": "",
      "tip": "有一块板要翻面才贴合",
      "outline": [
        [
          175,
          402.5
        ],
        [
          565,
          402.5
        ],
        [
          695,
          272.5
        ],
        [
          695,
          337.5
        ],
        [
          825,
          337.5
        ],
        [
          565,
          597.5
        ],
        [
          565,
          727.5
        ],
        [
          435,
          597.5
        ],
        [
          435,
          532.5
        ],
        [
          175,
          532.5
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 339.67,
          "y": 463.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "C",
          "x": 510.83,
          "y": 527.08,
          "angle": 90,
          "flipped": true
        },
        {
          "id": "B",
          "x": 521.67,
          "y": 640.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "D",
          "x": 657.08,
          "y": 421.46,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 112,
      "parSteps": 27,
      "needFlip": true
    }
  ];

  root.TANGRAM_DATA = { dataset: DATASET, levels: LEVELS };
})(typeof window !== 'undefined' ? window : globalThis);

/* ==== TANGRAM7_DATA_BEGIN (generated by tools/build_tangram7.js) ==== */
(function (root) {
  var FOUR = root.TANGRAM_DATA;            // 四巧板原样保留，一个字节都不改
  var DATA7 = {
  "id": "tangram7",
  "name": "七巧板",
  "unitScale": 107,
  "pieceOrder": [
    "T1",
    "T2",
    "T3",
    "S",
    "T4",
    "T5",
    "P"
  ],
  "snapGrid": 53.5,
  "tray": {
    "cols": 2,
    "gapX": 8,
    "gapY": 4,
    "top": 912,
    "bottom": 1410,
    "padX": 8,
    "padY": 0,
    "minW": 88,
    "minH": 88
  },
  "pieces": {
    "T1": {
      "id": "T1",
      "name": "大三角①",
      "color": "#FF8A5B",
      "stroke": "#D96A3D",
      "area": 4,
      "base": [
        [
          0,
          0
        ],
        [
          4,
          0
        ],
        [
          2,
          2
        ]
      ]
    },
    "T2": {
      "id": "T2",
      "name": "大三角②",
      "color": "#4FA8E0",
      "stroke": "#3585BC",
      "area": 4,
      "base": [
        [
          0,
          0
        ],
        [
          4,
          0
        ],
        [
          2,
          2
        ]
      ]
    },
    "T3": {
      "id": "T3",
      "name": "中三角",
      "color": "#63C88B",
      "stroke": "#46A66D",
      "area": 2,
      "base": [
        [
          0,
          0
        ],
        [
          2,
          0
        ],
        [
          0,
          2
        ]
      ]
    },
    "S": {
      "id": "S",
      "name": "正方形",
      "color": "#F47FA8",
      "stroke": "#D95C87",
      "area": 2,
      "base": [
        [
          1,
          0
        ],
        [
          2,
          1
        ],
        [
          1,
          2
        ],
        [
          0,
          1
        ]
      ]
    },
    "T4": {
      "id": "T4",
      "name": "小三角①",
      "color": "#A87BE8",
      "stroke": "#8455CC",
      "area": 1,
      "base": [
        [
          0,
          0
        ],
        [
          2,
          0
        ],
        [
          1,
          1
        ]
      ]
    },
    "T5": {
      "id": "T5",
      "name": "小三角②",
      "color": "#FFC94D",
      "stroke": "#E0A800",
      "area": 1,
      "base": [
        [
          0,
          0
        ],
        [
          2,
          0
        ],
        [
          1,
          1
        ]
      ]
    },
    "P": {
      "id": "P",
      "name": "平行四边形",
      "color": "#4FC9C0",
      "stroke": "#33A79E",
      "area": 2,
      "base": [
        [
          1,
          0
        ],
        [
          3,
          0
        ],
        [
          2,
          1
        ],
        [
          0,
          1
        ]
      ]
    }
  }
};
  var LEVELS7 = [
  {
    "id": 1,
    "chapter": 1,
    "name": "正方形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        286,
        286
      ],
      [
        714,
        286
      ],
      [
        714,
        714
      ],
      [
        286,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 357.33,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 642.67,
        "y": 642.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 571.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 678.33,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 446.5,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          714,
          286
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          607,
          393
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          286,
          286
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          393,
          607
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          286,
          714
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          607,
          607
        ],
        [
          714,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          607,
          607
        ],
        [
          393,
          607
        ]
      ],
      [
        [
          714,
          500
        ],
        [
          607,
          393
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": false
  },
  {
    "id": 2,
    "chapter": 1,
    "name": "大三角形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        714,
        500
      ],
      [
        286,
        928
      ],
      [
        286,
        72
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 357.33,
        "y": 714,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 357.33,
        "y": 428.67,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 286,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 357.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 321.67,
        "y": 179,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 553.5,
        "y": 446.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          286,
          500
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          714,
          500
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          286,
          500
        ]
      ],
      [
        [
          286,
          286
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          607,
          393
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          500,
          286
        ]
      ],
      [
        [
          393,
          179
        ],
        [
          286,
          286
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 3,
    "chapter": 1,
    "name": "平行四边形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        500,
        286
      ],
      [
        928,
        286
      ],
      [
        500,
        714
      ],
      [
        72,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 714,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 571.33,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 428.67,
        "y": 642.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 286,
        "y": 571.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 464.33,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 232.5,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          714,
          500
        ],
        [
          500,
          286
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          500,
          286
        ]
      ],
      [
        [
          286,
          714
        ],
        [
          393,
          607
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          286,
          500
        ],
        [
          393,
          607
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          179,
          607
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          393,
          393
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": false
  },
  {
    "id": 4,
    "chapter": 1,
    "name": "凹五边形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        286,
        134.679156
      ],
      [
        714,
        134.679156
      ],
      [
        588.641689,
        260.037467
      ],
      [
        588.641689,
        865.320845
      ],
      [
        286,
        562.679156
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 206.01,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 357.33,
        "y": 348.68,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 386.88,
        "y": 562.68,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 512.98,
        "y": 487.02,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 538.2,
        "y": 613.12,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 538.2,
        "y": 360.92,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 512.98,
        "y": 714,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          588.641702,
          260.037453
        ],
        [
          500,
          348.679156
        ]
      ],
      [
        [
          500,
          348.679156
        ],
        [
          286,
          134.679156
        ]
      ],
      [
        [
          500,
          348.679156
        ],
        [
          437.320851,
          411.358304
        ]
      ],
      [
        [
          437.320851,
          411.358304
        ],
        [
          286,
          562.679156
        ]
      ],
      [
        [
          437.320851,
          411.358304
        ],
        [
          437.320851,
          562.679156
        ]
      ],
      [
        [
          437.320851,
          562.679156
        ],
        [
          437.320851,
          714.000007
        ]
      ],
      [
        [
          588.641702,
          714.000007
        ],
        [
          437.320851,
          562.679156
        ]
      ],
      [
        [
          437.320851,
          562.679156
        ],
        [
          588.641702,
          562.679156
        ]
      ],
      [
        [
          588.641702,
          411.358304
        ],
        [
          437.320851,
          411.358304
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 5,
    "chapter": 1,
    "name": "凹六边形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        437.320845,
        197.358311
      ],
      [
        865.320845,
        197.358311
      ],
      [
        437.320845,
        625.358311
      ],
      [
        437.320845,
        802.641689
      ],
      [
        285.999947,
        651.320898
      ],
      [
        134.679156,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 651.32,
        "y": 268.69,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 508.65,
        "y": 411.36,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 235.56,
        "y": 500,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 361.66,
        "y": 424.34,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.88,
        "y": 550.44,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.88,
        "y": 298.24,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 361.66,
        "y": 651.32,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          651.320845,
          411.358311
        ],
        [
          437.320845,
          197.358311
        ]
      ],
      [
        [
          437.320845,
          625.358311
        ],
        [
          437.320845,
          500.000013
        ]
      ],
      [
        [
          437.320845,
          500.000013
        ],
        [
          437.320845,
          348.679162
        ]
      ],
      [
        [
          437.320845,
          348.679162
        ],
        [
          437.320845,
          197.358311
        ]
      ],
      [
        [
          285.999993,
          348.679162
        ],
        [
          285.999993,
          500.000013
        ]
      ],
      [
        [
          285.999993,
          500.000013
        ],
        [
          285.999993,
          651.320865
        ]
      ],
      [
        [
          437.320845,
          651.320865
        ],
        [
          285.999993,
          500.000013
        ]
      ],
      [
        [
          285.999993,
          500.000013
        ],
        [
          437.320845,
          500.000013
        ]
      ],
      [
        [
          437.320845,
          348.679162
        ],
        [
          285.999993,
          348.679162
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 6,
    "chapter": 1,
    "name": "凹七边形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        437.320845,
        223.320844
      ],
      [
        865.320845,
        223.320844
      ],
      [
        437.320845,
        651.320845
      ],
      [
        437.320845,
        802.641743
      ],
      [
        285.999947,
        651.320845
      ],
      [
        134.679156,
        499.999946
      ],
      [
        437.320845,
        197.358257
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 651.32,
        "y": 294.65,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 508.65,
        "y": 437.32,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 235.56,
        "y": 500,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 361.66,
        "y": 424.34,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.88,
        "y": 550.44,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.88,
        "y": 298.24,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 361.66,
        "y": 651.32,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          651.320845,
          437.320844
        ],
        [
          437.320845,
          223.320844
        ]
      ],
      [
        [
          437.320845,
          651.320845
        ],
        [
          437.320845,
          499.999993
        ]
      ],
      [
        [
          437.320845,
          499.999993
        ],
        [
          437.320845,
          348.679142
        ]
      ],
      [
        [
          437.320845,
          348.679142
        ],
        [
          437.320845,
          223.320844
        ]
      ],
      [
        [
          285.999993,
          348.679142
        ],
        [
          285.999993,
          499.999993
        ]
      ],
      [
        [
          285.999993,
          499.999993
        ],
        [
          285.999993,
          651.320845
        ]
      ],
      [
        [
          437.320845,
          651.320845
        ],
        [
          285.999993,
          499.999993
        ]
      ],
      [
        [
          285.999993,
          499.999993
        ],
        [
          437.320845,
          499.999993
        ]
      ],
      [
        [
          437.320844,
          348.679142
        ],
        [
          285.999993,
          348.679142
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 7,
    "chapter": 1,
    "name": "凹八边形",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        437.320845,
        437.320845
      ],
      [
        865.320845,
        437.320845
      ],
      [
        437.320845,
        865.320845
      ],
      [
        437.320845,
        739.962534
      ],
      [
        285.999947,
        588.641743
      ],
      [
        134.679156,
        437.320845
      ],
      [
        285.999947,
        285.999947
      ],
      [
        437.320845,
        134.679156
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 651.32,
        "y": 508.65,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 508.65,
        "y": 651.32,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 235.56,
        "y": 437.32,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 361.66,
        "y": 361.66,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.88,
        "y": 487.76,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.88,
        "y": 235.56,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 361.66,
        "y": 588.64,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          651.320845,
          651.320845
        ],
        [
          437.320845,
          437.320845
        ]
      ],
      [
        [
          437.320845,
          739.962547
        ],
        [
          437.320845,
          588.641696
        ]
      ],
      [
        [
          437.320845,
          588.641696
        ],
        [
          437.320845,
          437.320845
        ]
      ],
      [
        [
          285.999993,
          285.999993
        ],
        [
          285.999993,
          437.320845
        ]
      ],
      [
        [
          285.999993,
          437.320845
        ],
        [
          285.999993,
          588.641696
        ]
      ],
      [
        [
          437.320845,
          588.641696
        ],
        [
          285.999993,
          437.320845
        ]
      ],
      [
        [
          285.999993,
          437.320845
        ],
        [
          437.320845,
          437.320845
        ]
      ],
      [
        [
          437.320844,
          285.999993
        ],
        [
          285.999993,
          285.999993
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 8,
    "chapter": 1,
    "name": "大三角·立",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        928,
        286
      ],
      [
        500,
        714
      ],
      [
        72,
        286
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 714,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 571.33,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 428.67,
        "y": 357.33,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 286,
        "y": 428.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 464.33,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 232.5,
        "y": 339.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          714,
          500
        ],
        [
          500,
          286
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          500,
          286
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          286,
          286
        ]
      ],
      [
        [
          179,
          393
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          286,
          500
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          500,
          500
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 9,
    "chapter": 1,
    "name": "平行四边形·竖",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        714,
        500
      ],
      [
        286,
        928
      ],
      [
        286,
        500
      ],
      [
        714,
        72
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 357.33,
        "y": 714,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 642.67,
        "y": 428.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 286,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 357.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 678.33,
        "y": 179,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 446.5,
        "y": 446.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          286,
          500
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          714,
          500
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          286,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          607,
          393
        ],
        [
          714,
          286
        ]
      ],
      [
        [
          500,
          286
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          607,
          393
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          714,
          286
        ],
        [
          607,
          179
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": false
  },
  {
    "id": 10,
    "chapter": 1,
    "name": "凹五边形·横",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
      [
        134.679156,
        286
      ],
      [
        562.679156,
        286
      ],
      [
        865.320845,
        588.641689
      ],
      [
        260.037467,
        588.641689
      ],
      [
        134.679156,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 348.68,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 206.01,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 562.68,
        "y": 386.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 638.34,
        "y": 512.98,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 512.24,
        "y": 538.2,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 764.44,
        "y": 538.2,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 411.36,
        "y": 512.98,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          562.679156,
          286
        ],
        [
          411.358304,
          437.320851
        ]
      ],
      [
        [
          411.358304,
          437.320851
        ],
        [
          348.679156,
          500
        ]
      ],
      [
        [
          348.679156,
          500
        ],
        [
          134.679156,
          286
        ]
      ],
      [
        [
          348.679156,
          500
        ],
        [
          260.037453,
          588.641702
        ]
      ],
      [
        [
          714.000007,
          437.320851
        ],
        [
          562.679156,
          437.320851
        ]
      ],
      [
        [
          562.679156,
          437.320851
        ],
        [
          411.358304,
          437.320851
        ]
      ],
      [
        [
          411.358304,
          588.641702
        ],
        [
          562.679156,
          437.320851
        ]
      ],
      [
        [
          562.679156,
          437.320851
        ],
        [
          562.679156,
          588.641702
        ]
      ],
      [
        [
          714.000007,
          588.641702
        ],
        [
          714.000007,
          437.320851
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "id": 11,
    "chapter": 2,
    "name": "飞鸟",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        446.5,
        821
      ],
      [
        232.5,
        607
      ],
      [
        339.5,
        500
      ],
      [
        232.5,
        393
      ],
      [
        446.5,
        179
      ],
      [
        446.5,
        393
      ],
      [
        660.5,
        179
      ],
      [
        660.5,
        393
      ],
      [
        767.5,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 446.5,
        "y": 678.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 446.5,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 321.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 339.5,
        "y": 393,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 410.83,
        "y": 286,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660.5,
        "y": 535.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 607,
        "y": 446.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          232.5,
          607
        ],
        [
          660.5,
          607
        ]
      ],
      [
        [
          339.5,
          500
        ],
        [
          446.5,
          393
        ]
      ],
      [
        [
          446.5,
          393
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          553.5,
          500
        ],
        [
          660.5,
          607
        ]
      ],
      [
        [
          446.5,
          393
        ],
        [
          660.5,
          393
        ]
      ],
      [
        [
          767.5,
          500
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          339.5,
          286
        ],
        [
          446.5,
          393
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 12,
    "chapter": 2,
    "name": "天鹅",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        767.5,
        607
      ],
      [
        660.5,
        607
      ],
      [
        660.5,
        821
      ],
      [
        446.5,
        607
      ],
      [
        339.5,
        607
      ],
      [
        232.5,
        500
      ],
      [
        553.5,
        179
      ],
      [
        660.5,
        286
      ],
      [
        767.5,
        179
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 696.17,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 678.33,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 286,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 339.5,
        "y": 535.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 446.5,
        "y": 357.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 446.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          660.5,
          607
        ],
        [
          446.5,
          607
        ]
      ],
      [
        [
          339.5,
          607
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          553.5,
          393
        ]
      ],
      [
        [
          553.5,
          393
        ],
        [
          767.5,
          607
        ]
      ],
      [
        [
          553.5,
          393
        ],
        [
          660.5,
          286
        ]
      ],
      [
        [
          553.5,
          393
        ],
        [
          446.5,
          286
        ]
      ],
      [
        [
          339.5,
          393
        ],
        [
          553.5,
          393
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          232.5,
          500
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": false
  },
  {
    "id": 13,
    "chapter": 2,
    "name": "雄鹰",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        767.5,
        393
      ],
      [
        767.5,
        821
      ],
      [
        553.5,
        607
      ],
      [
        446.5,
        714
      ],
      [
        339.5,
        607
      ],
      [
        339.5,
        393
      ],
      [
        232.5,
        286
      ],
      [
        446.5,
        286
      ],
      [
        553.5,
        179
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 696.17,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 624.83,
        "y": 321.67,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 446.5,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 375.17,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 517.83,
        "y": 286,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 339.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          607
        ],
        [
          767.5,
          393
        ]
      ],
      [
        [
          339.5,
          393
        ],
        [
          553.5,
          393
        ]
      ],
      [
        [
          553.5,
          393
        ],
        [
          767.5,
          393
        ]
      ],
      [
        [
          553.5,
          607
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          339.5,
          393
        ]
      ],
      [
        [
          553.5,
          393
        ],
        [
          553.5,
          179
        ]
      ],
      [
        [
          339.5,
          607
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          286
        ],
        [
          553.5,
          393
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 14,
    "chapter": 2,
    "name": "鸭子",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        553.5,
        179
      ],
      [
        767.5,
        393
      ],
      [
        767.5,
        607
      ],
      [
        553.5,
        607
      ],
      [
        553.5,
        821
      ],
      [
        446.5,
        714
      ],
      [
        339.5,
        821
      ],
      [
        339.5,
        607
      ],
      [
        232.5,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 321.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 696.17,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 339.5,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 410.83,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 375.17,
        "y": 714,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          767.5,
          393
        ],
        [
          339.5,
          393
        ]
      ],
      [
        [
          553.5,
          607
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          339.5,
          393
        ]
      ],
      [
        [
          767.5,
          393
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          339.5,
          607
        ]
      ],
      [
        [
          446.5,
          714
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          714
        ],
        [
          339.5,
          607
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": false
  },
  {
    "id": 15,
    "chapter": 2,
    "name": "燕子",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        473.25,
        179
      ],
      [
        794.25,
        500
      ],
      [
        473.25,
        821
      ],
      [
        473.25,
        607
      ],
      [
        419.75,
        553.5
      ],
      [
        419.75,
        767.5
      ],
      [
        205.75,
        553.5
      ],
      [
        312.75,
        446.5
      ],
      [
        259.25,
        393
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 401.92,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 544.58,
        "y": 393,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 651.58,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 312.75,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 384.08,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 687.25,
        "y": 464.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 526.75,
        "y": 660.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          473.25,
          607
        ],
        [
          473.25,
          179
        ]
      ],
      [
        [
          687.25,
          393
        ],
        [
          580.25,
          500
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          473.25,
          607
        ]
      ],
      [
        [
          419.75,
          553.5
        ],
        [
          312.75,
          446.5
        ]
      ],
      [
        [
          419.75,
          553.5
        ],
        [
          312.75,
          660.5
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          580.25,
          714
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          794.25,
          500
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 16,
    "chapter": 2,
    "name": "栖鸟",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        473.25,
        607
      ],
      [
        419.75,
        553.5
      ],
      [
        419.75,
        767.5
      ],
      [
        205.75,
        553.5
      ],
      [
        312.75,
        446.5
      ],
      [
        259.25,
        393
      ],
      [
        473.25,
        179
      ],
      [
        794.25,
        500
      ],
      [
        473.25,
        821
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 473.25,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 473.25,
        "y": 321.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 651.58,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 312.75,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 687.25,
        "y": 464.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 384.08,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 526.75,
        "y": 660.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          419.75,
          553.5
        ],
        [
          312.75,
          446.5
        ]
      ],
      [
        [
          259.25,
          393
        ],
        [
          687.25,
          393
        ]
      ],
      [
        [
          687.25,
          393
        ],
        [
          580.25,
          500
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          473.25,
          607
        ]
      ],
      [
        [
          419.75,
          553.5
        ],
        [
          312.75,
          660.5
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          580.25,
          714
        ]
      ],
      [
        [
          580.25,
          500
        ],
        [
          794.25,
          500
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 17,
    "chapter": 2,
    "name": "鸽子",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        767.5,
        232.5
      ],
      [
        767.5,
        660.5
      ],
      [
        660.5,
        553.5
      ],
      [
        446.5,
        767.5
      ],
      [
        339.5,
        660.5
      ],
      [
        446.5,
        553.5
      ],
      [
        232.5,
        553.5
      ],
      [
        339.5,
        446.5
      ],
      [
        339.5,
        232.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 696.17,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 410.83,
        "y": 375.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 482.17,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 410.83,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 500,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          660.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          767.5,
          232.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          232.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          660.5
        ],
        [
          446.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          446.5,
          767.5
        ],
        [
          446.5,
          553.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": false
  },
  {
    "id": 18,
    "chapter": 2,
    "name": "企鹅",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        232.5
      ],
      [
        767.5,
        232.5
      ],
      [
        767.5,
        660.5
      ],
      [
        660.5,
        553.5
      ],
      [
        446.5,
        767.5
      ],
      [
        446.5,
        553.5
      ],
      [
        339.5,
        660.5
      ],
      [
        232.5,
        553.5
      ],
      [
        339.5,
        446.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 696.17,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 410.83,
        "y": 375.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 339.5,
        "y": 589.17,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 482.17,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 500,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          232.5
        ]
      ],
      [
        [
          767.5,
          232.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          660.5
        ],
        [
          446.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          232.5,
          553.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": false
  },
  {
    "id": 19,
    "chapter": 2,
    "name": "长尾鸟",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        232.5
      ],
      [
        767.5,
        232.5
      ],
      [
        767.5,
        660.5
      ],
      [
        660.5,
        553.5
      ],
      [
        553.5,
        660.5
      ],
      [
        446.5,
        553.5
      ],
      [
        446.5,
        767.5
      ],
      [
        232.5,
        553.5
      ],
      [
        339.5,
        446.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 696.17,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 410.83,
        "y": 375.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 339.5,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 553.5,
        "y": 589.17,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 410.83,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 500,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          232.5
        ]
      ],
      [
        [
          767.5,
          232.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          553.5
        ],
        [
          446.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          339.5,
          660.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 20,
    "chapter": 2,
    "name": "雏鸟",
    "tip": "动物·飞禽 · 七块板拼出剪影",
    "outline": [
      [
        500,
        821
      ],
      [
        179,
        500
      ],
      [
        393,
        500
      ],
      [
        286,
        393
      ],
      [
        500,
        179
      ],
      [
        500,
        393
      ],
      [
        714,
        393
      ],
      [
        821,
        286
      ],
      [
        821,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 678.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 642.67,
        "y": 464.33,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 393,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 286,
        "y": 535.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 464.33,
        "y": 286,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 767.5,
        "y": 446.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          286,
          607
        ],
        [
          714,
          607
        ]
      ],
      [
        [
          286,
          607
        ],
        [
          393,
          500
        ]
      ],
      [
        [
          393,
          500
        ],
        [
          500,
          393
        ]
      ],
      [
        [
          500,
          393
        ],
        [
          714,
          607
        ]
      ],
      [
        [
          714,
          393
        ],
        [
          714,
          607
        ]
      ],
      [
        [
          393,
          286
        ],
        [
          500,
          393
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 120,
    "parSteps": 28,
    "needFlip": true
  },
  {
    "id": 21,
    "chapter": 3,
    "name": "卧猫",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        580.25,
        366.25
      ],
      [
        633.75,
        312.75
      ],
      [
        847.75,
        312.75
      ],
      [
        847.75,
        526.75
      ],
      [
        633.75,
        740.75
      ],
      [
        526.75,
        633.75
      ],
      [
        312.75,
        633.75
      ],
      [
        366.25,
        580.25
      ],
      [
        152.25,
        366.25
      ],
      [
        366.25,
        366.25
      ],
      [
        473.25,
        259.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 562.42,
        "y": 526.75,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 705.08,
        "y": 526.75,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 776.42,
        "y": 384.08,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 473.25,
        "y": 366.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 366.25,
        "y": 508.92,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 419.75,
        "y": 598.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 312.75,
        "y": 419.75,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          419.75,
          526.75
        ],
        [
          473.25,
          473.25
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          580.25,
          366.25
        ]
      ],
      [
        [
          633.75,
          312.75
        ],
        [
          633.75,
          740.75
        ]
      ],
      [
        [
          526.75,
          633.75
        ],
        [
          419.75,
          526.75
        ]
      ],
      [
        [
          633.75,
          312.75
        ],
        [
          847.75,
          526.75
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          366.25,
          366.25
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          259.25,
          473.25
        ]
      ],
      [
        [
          419.75,
          526.75
        ],
        [
          366.25,
          580.25
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": true
  },
  {
    "id": 22,
    "chapter": 3,
    "name": "坐犬",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        847.75,
        526.75
      ],
      [
        633.75,
        740.75
      ],
      [
        419.75,
        740.75
      ],
      [
        419.75,
        526.75
      ],
      [
        259.25,
        687.25
      ],
      [
        259.25,
        473.25
      ],
      [
        152.25,
        366.25
      ],
      [
        366.25,
        366.25
      ],
      [
        473.25,
        259.25
      ],
      [
        580.25,
        366.25
      ],
      [
        633.75,
        312.75
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 633.75,
        "y": 455.42,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 633.75,
        "y": 598.08,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 330.58,
        "y": 544.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 473.25,
        "y": 366.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 455.42,
        "y": 633.75,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 526.75,
        "y": 705.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 312.75,
        "y": 419.75,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          633.75,
          740.75
        ],
        [
          526.75,
          633.75
        ]
      ],
      [
        [
          526.75,
          633.75
        ],
        [
          419.75,
          526.75
        ]
      ],
      [
        [
          419.75,
          526.75
        ],
        [
          847.75,
          526.75
        ]
      ],
      [
        [
          419.75,
          526.75
        ],
        [
          473.25,
          473.25
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          580.25,
          366.25
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          366.25,
          366.25
        ]
      ],
      [
        [
          473.25,
          473.25
        ],
        [
          259.25,
          473.25
        ]
      ],
      [
        [
          526.75,
          633.75
        ],
        [
          419.75,
          740.75
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": true
  },
  {
    "id": 23,
    "chapter": 3,
    "name": "奔兔",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        660.5,
        767.5
      ],
      [
        232.5,
        767.5
      ],
      [
        339.5,
        660.5
      ],
      [
        125.5,
        660.5
      ],
      [
        446.5,
        339.5
      ],
      [
        553.5,
        446.5
      ],
      [
        553.5,
        232.5
      ],
      [
        660.5,
        339.5
      ],
      [
        660.5,
        446.5
      ],
      [
        874.5,
        446.5
      ],
      [
        660.5,
        660.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 589.17,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 446.5,
        "y": 696.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 731.83,
        "y": 517.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 446.5,
        "y": 446.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 589.17,
        "y": 339.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 339.5,
        "y": 517.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 286,
        "y": 607,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          339.5,
          660.5
        ],
        [
          446.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          660.5,
          767.5
        ]
      ],
      [
        [
          660.5,
          446.5
        ],
        [
          660.5,
          660.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          553.5,
          446.5
        ],
        [
          660.5,
          339.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          232.5,
          553.5
        ],
        [
          446.5,
          553.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 24,
    "chapter": 3,
    "name": "立马",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        633.75,
        687.25
      ],
      [
        580.25,
        633.75
      ],
      [
        473.25,
        740.75
      ],
      [
        366.25,
        633.75
      ],
      [
        152.25,
        633.75
      ],
      [
        366.25,
        419.75
      ],
      [
        312.75,
        366.25
      ],
      [
        419.75,
        259.25
      ],
      [
        633.75,
        259.25
      ],
      [
        847.75,
        473.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 562.42,
        "y": 473.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 705.08,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 491.08,
        "y": 330.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 473.25,
        "y": 633.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 384.08,
        "y": 366.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 366.25,
        "y": 491.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 312.75,
        "y": 580.25,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          633.75,
          259.25
        ],
        [
          633.75,
          687.25
        ]
      ],
      [
        [
          580.25,
          633.75
        ],
        [
          473.25,
          526.75
        ]
      ],
      [
        [
          473.25,
          526.75
        ],
        [
          419.75,
          473.25
        ]
      ],
      [
        [
          419.75,
          473.25
        ],
        [
          633.75,
          259.25
        ]
      ],
      [
        [
          419.75,
          473.25
        ],
        [
          419.75,
          259.25
        ]
      ],
      [
        [
          366.25,
          633.75
        ],
        [
          473.25,
          526.75
        ]
      ],
      [
        [
          259.25,
          526.75
        ],
        [
          473.25,
          526.75
        ]
      ],
      [
        [
          419.75,
          473.25
        ],
        [
          366.25,
          419.75
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 25,
    "chapter": 3,
    "name": "长颈兽",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        794.25,
        740.75
      ],
      [
        366.25,
        740.75
      ],
      [
        419.75,
        687.25
      ],
      [
        312.75,
        580.25
      ],
      [
        419.75,
        473.25
      ],
      [
        205.75,
        473.25
      ],
      [
        419.75,
        259.25
      ],
      [
        526.75,
        366.25
      ],
      [
        633.75,
        259.25
      ],
      [
        633.75,
        473.25
      ],
      [
        794.25,
        312.75
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 722.92,
        "y": 526.75,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 580.25,
        "y": 669.42,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 348.42,
        "y": 401.92,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 419.75,
        "y": 580.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 598.08,
        "y": 366.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 562.42,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 473.25,
        "y": 419.75,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          580.25,
          526.75
        ],
        [
          794.25,
          740.75
        ]
      ],
      [
        [
          419.75,
          687.25
        ],
        [
          526.75,
          580.25
        ]
      ],
      [
        [
          526.75,
          580.25
        ],
        [
          580.25,
          526.75
        ]
      ],
      [
        [
          580.25,
          526.75
        ],
        [
          633.75,
          473.25
        ]
      ],
      [
        [
          419.75,
          473.25
        ],
        [
          526.75,
          580.25
        ]
      ],
      [
        [
          419.75,
          473.25
        ],
        [
          419.75,
          259.25
        ]
      ],
      [
        [
          526.75,
          366.25
        ],
        [
          526.75,
          580.25
        ]
      ],
      [
        [
          526.75,
          366.25
        ],
        [
          633.75,
          473.25
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 26,
    "chapter": 3,
    "name": "狐狸",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        607,
        714
      ],
      [
        179,
        714
      ],
      [
        286,
        607
      ],
      [
        286,
        393
      ],
      [
        393,
        286
      ],
      [
        607,
        286
      ],
      [
        607,
        393
      ],
      [
        714,
        286
      ],
      [
        714,
        500
      ],
      [
        821,
        607
      ],
      [
        714,
        714
      ],
      [
        607,
        607
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 393,
        "y": 642.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 535.67,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 714,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 357.33,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 321.67,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 660.5,
        "y": 446.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          500
        ],
        [
          607,
          714
        ]
      ],
      [
        [
          286,
          607
        ],
        [
          393,
          500
        ]
      ],
      [
        [
          393,
          500
        ],
        [
          607,
          286
        ]
      ],
      [
        [
          607,
          393
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          393,
          500
        ],
        [
          393,
          286
        ]
      ],
      [
        [
          714,
          500
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          393,
          500
        ],
        [
          286,
          393
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": true
  },
  {
    "id": 27,
    "chapter": 3,
    "name": "松鼠",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        286,
        446.5
      ],
      [
        179,
        339.5
      ],
      [
        607,
        339.5
      ],
      [
        714,
        232.5
      ],
      [
        821,
        339.5
      ],
      [
        714,
        446.5
      ],
      [
        714,
        660.5
      ],
      [
        607,
        767.5
      ],
      [
        393,
        767.5
      ],
      [
        393,
        553.5
      ],
      [
        286,
        660.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 535.67,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 393,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 696.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 714,
        "y": 339.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 642.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 321.67,
        "y": 553.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 660.5,
        "y": 500,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          607,
          339.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          553.5
        ],
        [
          607,
          767.5
        ]
      ],
      [
        [
          607,
          767.5
        ],
        [
          393,
          553.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          607,
          339.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          286,
          446.5
        ]
      ],
      [
        [
          714,
          660.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          339.5
        ],
        [
          714,
          446.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 28,
    "chapter": 3,
    "name": "山羊",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        393,
        821
      ],
      [
        393,
        607
      ],
      [
        286,
        714
      ],
      [
        286,
        500
      ],
      [
        179,
        393
      ],
      [
        179,
        179
      ],
      [
        286,
        286
      ],
      [
        393,
        179
      ],
      [
        607,
        393
      ],
      [
        821,
        393
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 607,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 464.33,
        "y": 607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 321.67,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 286,
        "y": 393,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 357.33,
        "y": 286,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 214.67,
        "y": 286,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 553.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          607
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          286,
          500
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          179,
          393
        ],
        [
          286,
          286
        ]
      ],
      [
        [
          286,
          286
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          393,
          179
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": true
  },
  {
    "id": 29,
    "chapter": 3,
    "name": "小鹿",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        232.5
      ],
      [
        767.5,
        232.5
      ],
      [
        767.5,
        660.5
      ],
      [
        660.5,
        553.5
      ],
      [
        660.5,
        767.5
      ],
      [
        553.5,
        660.5
      ],
      [
        339.5,
        660.5
      ],
      [
        446.5,
        553.5
      ],
      [
        232.5,
        553.5
      ],
      [
        339.5,
        446.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 696.17,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 410.83,
        "y": 375.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 624.83,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 446.5,
        "y": 624.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 500,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          446.5
        ],
        [
          339.5,
          232.5
        ]
      ],
      [
        [
          767.5,
          232.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          553.5
        ],
        [
          553.5,
          660.5
        ]
      ],
      [
        [
          553.5,
          660.5
        ],
        [
          446.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          553.5
        ],
        [
          553.5,
          446.5
        ]
      ],
      [
        [
          339.5,
          446.5
        ],
        [
          553.5,
          446.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 30,
    "chapter": 3,
    "name": "伏兽",
    "tip": "动物·走兽 · 七块板拼出剪影",
    "outline": [
      [
        393,
        339.5
      ],
      [
        500,
        446.5
      ],
      [
        500,
        232.5
      ],
      [
        607,
        339.5
      ],
      [
        714,
        232.5
      ],
      [
        714,
        446.5
      ],
      [
        821,
        553.5
      ],
      [
        607,
        767.5
      ],
      [
        500,
        660.5
      ],
      [
        393,
        767.5
      ],
      [
        179,
        553.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 464.33,
        "y": 553.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 321.67,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 678.33,
        "y": 482.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 714,
        "y": 589.17,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 678.33,
        "y": 339.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 553.5,
        "y": 393,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          393,
          767.5
        ],
        [
          393,
          339.5
        ]
      ],
      [
        [
          500,
          446.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          553.5
        ],
        [
          500,
          660.5
        ]
      ],
      [
        [
          607,
          339.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          553.5
        ],
        [
          714,
          660.5
        ]
      ],
      [
        [
          607,
          339.5
        ],
        [
          714,
          446.5
        ]
      ],
      [
        [
          821,
          553.5
        ],
        [
          607,
          553.5
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 150,
    "parSteps": 32,
    "needFlip": false
  },
  {
    "id": 31,
    "chapter": 4,
    "name": "游鱼",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        553.5,
        607
      ],
      [
        446.5,
        714
      ],
      [
        339.5,
        607
      ],
      [
        125.5,
        607
      ],
      [
        446.5,
        286
      ],
      [
        874.5,
        286
      ],
      [
        767.5,
        393
      ],
      [
        767.5,
        607
      ],
      [
        660.5,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 517.83,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 660.5,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 375.17,
        "y": 428.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 660.5,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 410.83,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 731.83,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 286,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          660.5,
          500
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          446.5,
          714
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          446.5,
          286
        ]
      ],
      [
        [
          446.5,
          286
        ],
        [
          660.5,
          500
        ]
      ],
      [
        [
          767.5,
          393
        ],
        [
          660.5,
          500
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          767.5,
          607
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          232.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          339.5,
          607
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": false
  },
  {
    "id": 32,
    "chapter": 4,
    "name": "乌龟",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        553.5
      ],
      [
        232.5,
        660.5
      ],
      [
        232.5,
        232.5
      ],
      [
        660.5,
        232.5
      ],
      [
        660.5,
        446.5
      ],
      [
        767.5,
        553.5
      ],
      [
        553.5,
        553.5
      ],
      [
        553.5,
        767.5
      ],
      [
        446.5,
        660.5
      ],
      [
        339.5,
        767.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 303.83,
        "y": 446.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 446.5,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 375.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 446.5,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 375.17,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 517.83,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 607,
        "y": 500,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          446.5,
          446.5
        ],
        [
          339.5,
          553.5
        ]
      ],
      [
        [
          232.5,
          232.5
        ],
        [
          446.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          232.5
        ],
        [
          446.5,
          446.5
        ]
      ],
      [
        [
          660.5,
          446.5
        ],
        [
          446.5,
          446.5
        ]
      ],
      [
        [
          446.5,
          660.5
        ],
        [
          339.5,
          553.5
        ]
      ],
      [
        [
          446.5,
          446.5
        ],
        [
          553.5,
          553.5
        ]
      ],
      [
        [
          553.5,
          553.5
        ],
        [
          446.5,
          660.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 33,
    "chapter": 4,
    "name": "青蛙",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        714
      ],
      [
        339.5,
        500
      ],
      [
        232.5,
        607
      ],
      [
        232.5,
        393
      ],
      [
        339.5,
        286
      ],
      [
        767.5,
        286
      ],
      [
        660.5,
        393
      ],
      [
        767.5,
        500
      ],
      [
        660.5,
        607
      ],
      [
        767.5,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 410.83,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 482.17,
        "y": 642.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 660.5,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 660.5,
        "y": 678.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 589.17,
        "y": 607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 286,
        "y": 446.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          500
        ],
        [
          339.5,
          714
        ]
      ],
      [
        [
          339.5,
          500
        ],
        [
          339.5,
          286
        ]
      ],
      [
        [
          339.5,
          286
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          660.5,
          393
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          660.5,
          607
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          553.5,
          500
        ],
        [
          553.5,
          714
        ]
      ],
      [
        [
          660.5,
          607
        ],
        [
          553.5,
          714
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 34,
    "chapter": 4,
    "name": "螃蟹",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        232.5,
        714
      ],
      [
        232.5,
        286
      ],
      [
        660.5,
        286
      ],
      [
        660.5,
        500
      ],
      [
        767.5,
        393
      ],
      [
        767.5,
        607
      ],
      [
        660.5,
        714
      ],
      [
        446.5,
        714
      ],
      [
        553.5,
        607
      ],
      [
        339.5,
        607
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 446.5,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 303.83,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 428.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 660.5,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 731.83,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 553.5,
        "y": 678.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          232.5,
          286
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          446.5,
          500
        ],
        [
          339.5,
          607
        ]
      ],
      [
        [
          660.5,
          286
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          446.5,
          500
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          660.5,
          714
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          767.5,
          607
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": false
  },
  {
    "id": 35,
    "chapter": 4,
    "name": "海豚",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        767.5,
        286
      ],
      [
        767.5,
        714
      ],
      [
        660.5,
        607
      ],
      [
        553.5,
        714
      ],
      [
        339.5,
        714
      ],
      [
        232.5,
        607
      ],
      [
        339.5,
        500
      ],
      [
        232.5,
        393
      ],
      [
        446.5,
        393
      ],
      [
        339.5,
        286
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 696.17,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 357.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 410.83,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 303.83,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 446.5,
        "y": 678.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 446.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          660.5,
          607
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          553.5,
          500
        ],
        [
          767.5,
          286
        ]
      ],
      [
        [
          553.5,
          500
        ],
        [
          446.5,
          393
        ]
      ],
      [
        [
          553.5,
          714
        ],
        [
          446.5,
          607
        ]
      ],
      [
        [
          446.5,
          607
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          553.5,
          500
        ],
        [
          339.5,
          500
        ]
      ],
      [
        [
          446.5,
          607
        ],
        [
          339.5,
          714
        ]
      ],
      [
        [
          339.5,
          714
        ],
        [
          339.5,
          500
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 36,
    "chapter": 4,
    "name": "鲨鱼",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        607,
        687.25
      ],
      [
        553.5,
        633.75
      ],
      [
        446.5,
        740.75
      ],
      [
        339.5,
        633.75
      ],
      [
        446.5,
        526.75
      ],
      [
        393,
        473.25
      ],
      [
        286,
        580.25
      ],
      [
        179,
        473.25
      ],
      [
        286,
        366.25
      ],
      [
        179,
        259.25
      ],
      [
        607,
        259.25
      ],
      [
        821,
        473.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 678.33,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 535.67,
        "y": 473.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 330.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 446.5,
        "y": 633.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 250.33,
        "y": 473.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 286,
        "y": 294.92,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 419.75,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          607,
          259.25
        ],
        [
          607,
          687.25
        ]
      ],
      [
        [
          553.5,
          633.75
        ],
        [
          446.5,
          526.75
        ]
      ],
      [
        [
          393,
          473.25
        ],
        [
          607,
          259.25
        ]
      ],
      [
        [
          393,
          473.25
        ],
        [
          393,
          259.25
        ]
      ],
      [
        [
          286,
          580.25
        ],
        [
          286,
          366.25
        ]
      ],
      [
        [
          286,
          366.25
        ],
        [
          393,
          259.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 37,
    "chapter": 4,
    "name": "水蛇",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        714,
        473.25
      ],
      [
        660.5,
        526.75
      ],
      [
        660.5,
        740.75
      ],
      [
        553.5,
        633.75
      ],
      [
        500,
        687.25
      ],
      [
        286,
        687.25
      ],
      [
        179,
        580.25
      ],
      [
        286,
        473.25
      ],
      [
        286,
        259.25
      ],
      [
        714,
        259.25
      ],
      [
        821,
        366.25
      ],
      [
        607,
        366.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 428.67,
        "y": 473.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 571.33,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 357.33,
        "y": 330.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 286,
        "y": 580.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 624.83,
        "y": 633.75,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 393,
        "y": 651.58,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 660.5,
        "y": 312.75,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          286,
          473.25
        ],
        [
          500,
          259.25
        ]
      ],
      [
        [
          500,
          259.25
        ],
        [
          500,
          687.25
        ]
      ],
      [
        [
          500,
          687.25
        ],
        [
          393,
          580.25
        ]
      ],
      [
        [
          393,
          580.25
        ],
        [
          286,
          473.25
        ]
      ],
      [
        [
          660.5,
          526.75
        ],
        [
          553.5,
          633.75
        ]
      ],
      [
        [
          500,
          259.25
        ],
        [
          607,
          366.25
        ]
      ],
      [
        [
          393,
          580.25
        ],
        [
          286,
          687.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 38,
    "chapter": 4,
    "name": "鳄鱼",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        179,
        339.5
      ],
      [
        607,
        339.5
      ],
      [
        714,
        232.5
      ],
      [
        821,
        339.5
      ],
      [
        714,
        446.5
      ],
      [
        714,
        660.5
      ],
      [
        607,
        767.5
      ],
      [
        393,
        767.5
      ],
      [
        286,
        660.5
      ],
      [
        393,
        553.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 393,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 535.67,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 696.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 714,
        "y": 339.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 642.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 357.33,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 660.5,
        "y": 500,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          607,
          339.5
        ],
        [
          393,
          553.5
        ]
      ],
      [
        [
          607,
          339.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          553.5
        ],
        [
          607,
          767.5
        ]
      ],
      [
        [
          607,
          767.5
        ],
        [
          393,
          553.5
        ]
      ],
      [
        [
          714,
          660.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          339.5
        ],
        [
          714,
          446.5
        ]
      ],
      [
        [
          393,
          767.5
        ],
        [
          393,
          553.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": false
  },
  {
    "id": 39,
    "chapter": 4,
    "name": "虾",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        393,
        232.5
      ],
      [
        821,
        232.5
      ],
      [
        714,
        339.5
      ],
      [
        714,
        553.5
      ],
      [
        607,
        660.5
      ],
      [
        393,
        660.5
      ],
      [
        286,
        767.5
      ],
      [
        286,
        553.5
      ],
      [
        393,
        446.5
      ],
      [
        179,
        446.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 607,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 464.33,
        "y": 446.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 321.67,
        "y": 375.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 624.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 678.33,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 607,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          660.5
        ],
        [
          393,
          446.5
        ]
      ],
      [
        [
          393,
          446.5
        ],
        [
          393,
          232.5
        ]
      ],
      [
        [
          393,
          232.5
        ],
        [
          607,
          446.5
        ]
      ],
      [
        [
          607,
          446.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          500,
          553.5
        ],
        [
          393,
          660.5
        ]
      ],
      [
        [
          714,
          339.5
        ],
        [
          607,
          446.5
        ]
      ],
      [
        [
          607,
          660.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          607,
          446.5
        ],
        [
          714,
          553.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": true
  },
  {
    "id": 40,
    "chapter": 4,
    "name": "金鱼",
    "tip": "水族·爬行 · 七块板拼出剪影",
    "outline": [
      [
        821,
        553.5
      ],
      [
        607,
        767.5
      ],
      [
        393,
        767.5
      ],
      [
        286,
        660.5
      ],
      [
        393,
        553.5
      ],
      [
        179,
        553.5
      ],
      [
        286,
        446.5
      ],
      [
        286,
        232.5
      ],
      [
        393,
        339.5
      ],
      [
        607,
        339.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 607,
        "y": 482.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 607,
        "y": 624.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 464.33,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 731.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 286,
        "y": 517.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 393,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          607,
          767.5
        ],
        [
          500,
          660.5
        ]
      ],
      [
        [
          500,
          660.5
        ],
        [
          393,
          553.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          821,
          553.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          607,
          339.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          393,
          339.5
        ]
      ],
      [
        [
          500,
          660.5
        ],
        [
          393,
          767.5
        ]
      ],
      [
        [
          393,
          553.5
        ],
        [
          286,
          446.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 180,
    "parSteps": 36,
    "needFlip": false
  },
  {
    "id": 41,
    "chapter": 5,
    "name": "立人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        473.25,
        607
      ],
      [
        366.25,
        714
      ],
      [
        259.25,
        607
      ],
      [
        366.25,
        500
      ],
      [
        312.75,
        446.5
      ],
      [
        419.75,
        339.5
      ],
      [
        419.75,
        125.5
      ],
      [
        580.25,
        286
      ],
      [
        687.25,
        179
      ],
      [
        687.25,
        393
      ],
      [
        740.75,
        446.5
      ],
      [
        740.75,
        874.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 526.75,
        "y": 517.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 669.42,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 598.08,
        "y": 375.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 366.25,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 651.58,
        "y": 286,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 419.75,
        "y": 410.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 473.25,
        "y": 286,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          312.75,
          446.5
        ],
        [
          526.75,
          446.5
        ]
      ],
      [
        [
          526.75,
          446.5
        ],
        [
          740.75,
          446.5
        ]
      ],
      [
        [
          740.75,
          446.5
        ],
        [
          526.75,
          660.5
        ]
      ],
      [
        [
          473.25,
          607
        ],
        [
          366.25,
          500
        ]
      ],
      [
        [
          526.75,
          446.5
        ],
        [
          526.75,
          232.5
        ]
      ],
      [
        [
          580.25,
          286
        ],
        [
          687.25,
          393
        ]
      ],
      [
        [
          526.75,
          446.5
        ],
        [
          419.75,
          339.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": false
  },
  {
    "id": 42,
    "chapter": 5,
    "name": "行者",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        393,
        446.5
      ],
      [
        286,
        339.5
      ],
      [
        393,
        339.5
      ],
      [
        607,
        125.5
      ],
      [
        607,
        339.5
      ],
      [
        714,
        339.5
      ],
      [
        714,
        767.5
      ],
      [
        607,
        660.5
      ],
      [
        393,
        874.5
      ],
      [
        393,
        660.5
      ],
      [
        286,
        767.5
      ],
      [
        286,
        553.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 642.67,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 535.67,
        "y": 268.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 535.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 321.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 446.5,
        "y": 714,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          500,
          553.5
        ],
        [
          393,
          446.5
        ]
      ],
      [
        [
          393,
          339.5
        ],
        [
          607,
          339.5
        ]
      ],
      [
        [
          714,
          339.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          607,
          660.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          500,
          553.5
        ],
        [
          393,
          660.5
        ]
      ],
      [
        [
          393,
          660.5
        ],
        [
          286,
          553.5
        ]
      ],
      [
        [
          500,
          553.5
        ],
        [
          500,
          767.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 43,
    "chapter": 5,
    "name": "奔人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        312.75,
        874.5
      ],
      [
        312.75,
        446.5
      ],
      [
        205.75,
        446.5
      ],
      [
        526.75,
        125.5
      ],
      [
        526.75,
        339.5
      ],
      [
        633.75,
        232.5
      ],
      [
        740.75,
        339.5
      ],
      [
        633.75,
        446.5
      ],
      [
        740.75,
        446.5
      ],
      [
        687.25,
        500
      ],
      [
        794.25,
        607
      ],
      [
        580.25,
        607
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 384.08,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 526.75,
        "y": 517.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 455.42,
        "y": 268.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 633.75,
        "y": 339.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 687.25,
        "y": 571.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 312.75,
        "y": 410.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 473.25,
        "y": 393,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          312.75,
          446.5
        ],
        [
          526.75,
          660.5
        ]
      ],
      [
        [
          312.75,
          446.5
        ],
        [
          419.75,
          446.5
        ]
      ],
      [
        [
          419.75,
          446.5
        ],
        [
          633.75,
          446.5
        ]
      ],
      [
        [
          687.25,
          500
        ],
        [
          580.25,
          607
        ]
      ],
      [
        [
          312.75,
          339.5
        ],
        [
          526.75,
          339.5
        ]
      ],
      [
        [
          526.75,
          339.5
        ],
        [
          633.75,
          446.5
        ]
      ],
      [
        [
          419.75,
          446.5
        ],
        [
          312.75,
          339.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 44,
    "chapter": 5,
    "name": "舞者",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        714,
        339.5
      ],
      [
        714,
        767.5
      ],
      [
        607,
        660.5
      ],
      [
        500,
        767.5
      ],
      [
        393,
        660.5
      ],
      [
        286,
        767.5
      ],
      [
        286,
        339.5
      ],
      [
        393,
        339.5
      ],
      [
        500,
        232.5
      ],
      [
        714,
        232.5
      ],
      [
        607,
        339.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 642.67,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 357.33,
        "y": 482.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 321.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 393,
        "y": 589.17,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 553.5,
        "y": 286,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          500,
          553.5
        ],
        [
          714,
          339.5
        ]
      ],
      [
        [
          607,
          660.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          393,
          339.5
        ],
        [
          607,
          339.5
        ]
      ],
      [
        [
          500,
          553.5
        ],
        [
          286,
          339.5
        ]
      ],
      [
        [
          500,
          553.5
        ],
        [
          286,
          553.5
        ]
      ],
      [
        [
          393,
          660.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          393,
          660.5
        ],
        [
          286,
          553.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": false
  },
  {
    "id": 45,
    "chapter": 5,
    "name": "举臂人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        821
      ],
      [
        339.5,
        607
      ],
      [
        232.5,
        714
      ],
      [
        232.5,
        500
      ],
      [
        553.5,
        179
      ],
      [
        553.5,
        393
      ],
      [
        767.5,
        393
      ],
      [
        660.5,
        500
      ],
      [
        767.5,
        607
      ],
      [
        553.5,
        821
      ],
      [
        446.5,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 410.83,
        "y": 607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 482.17,
        "y": 321.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 714,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 696.17,
        "y": 607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 624.83,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 286,
        "y": 553.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          339.5,
          607
        ],
        [
          339.5,
          393
        ]
      ],
      [
        [
          339.5,
          393
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          553.5,
          607
        ],
        [
          446.5,
          714
        ]
      ],
      [
        [
          339.5,
          393
        ],
        [
          553.5,
          393
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          553.5,
          607
        ]
      ],
      [
        [
          553.5,
          607
        ],
        [
          660.5,
          714
        ]
      ],
      [
        [
          660.5,
          500
        ],
        [
          660.5,
          714
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 46,
    "chapter": 5,
    "name": "侧身人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        500
      ],
      [
        232.5,
        393
      ],
      [
        446.5,
        179
      ],
      [
        767.5,
        500
      ],
      [
        660.5,
        607
      ],
      [
        767.5,
        714
      ],
      [
        553.5,
        714
      ],
      [
        446.5,
        821
      ],
      [
        446.5,
        607
      ],
      [
        339.5,
        714
      ],
      [
        232.5,
        607
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 517.83,
        "y": 393,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 375.17,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 339.5,
        "y": 607,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 482.17,
        "y": 714,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 696.17,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 607,
        "y": 660.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          446.5,
          179
        ],
        [
          446.5,
          607
        ]
      ],
      [
        [
          446.5,
          607
        ],
        [
          339.5,
          500
        ]
      ],
      [
        [
          660.5,
          393
        ],
        [
          446.5,
          607
        ]
      ],
      [
        [
          660.5,
          393
        ],
        [
          660.5,
          607
        ]
      ],
      [
        [
          660.5,
          607
        ],
        [
          446.5,
          607
        ]
      ],
      [
        [
          553.5,
          714
        ],
        [
          446.5,
          607
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 47,
    "chapter": 5,
    "name": "弯腰人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        446.5,
        821
      ],
      [
        232.5,
        607
      ],
      [
        339.5,
        500
      ],
      [
        232.5,
        393
      ],
      [
        446.5,
        179
      ],
      [
        553.5,
        286
      ],
      [
        660.5,
        179
      ],
      [
        660.5,
        393
      ],
      [
        767.5,
        500
      ],
      [
        553.5,
        500
      ],
      [
        660.5,
        607
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 446.5,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 446.5,
        "y": 678.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 589.17,
        "y": 321.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 339.5,
        "y": 393,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 446.5,
        "y": 250.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 446.5,
        "y": 321.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 607,
        "y": 446.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          232.5,
          607
        ],
        [
          660.5,
          607
        ]
      ],
      [
        [
          339.5,
          500
        ],
        [
          446.5,
          393
        ]
      ],
      [
        [
          446.5,
          393
        ],
        [
          553.5,
          500
        ]
      ],
      [
        [
          446.5,
          393
        ],
        [
          660.5,
          393
        ]
      ],
      [
        [
          339.5,
          286
        ],
        [
          446.5,
          393
        ]
      ],
      [
        [
          446.5,
          393
        ],
        [
          553.5,
          286
        ]
      ],
      [
        [
          339.5,
          286
        ],
        [
          553.5,
          286
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 48,
    "chapter": 5,
    "name": "踏步人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        500,
        286
      ],
      [
        553.5,
        339.5
      ],
      [
        660.5,
        232.5
      ],
      [
        660.5,
        446.5
      ],
      [
        714,
        500
      ],
      [
        714,
        714
      ],
      [
        607,
        821
      ],
      [
        500,
        714
      ],
      [
        286,
        714
      ],
      [
        286,
        286
      ],
      [
        393,
        179
      ],
      [
        393,
        393
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 428.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 357.33,
        "y": 642.67,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 714,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 678.33,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 624.83,
        "y": 339.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 339.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          286,
          500
        ],
        [
          714,
          500
        ]
      ],
      [
        [
          714,
          500
        ],
        [
          607,
          607
        ]
      ],
      [
        [
          607,
          607
        ],
        [
          500,
          714
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          286,
          500
        ]
      ],
      [
        [
          553.5,
          339.5
        ],
        [
          660.5,
          446.5
        ]
      ],
      [
        [
          286,
          500
        ],
        [
          393,
          393
        ]
      ],
      [
        [
          607,
          607
        ],
        [
          714,
          714
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": true
  },
  {
    "id": 49,
    "chapter": 5,
    "name": "扬手人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        660.5,
        419.75
      ],
      [
        767.5,
        526.75
      ],
      [
        553.5,
        740.75
      ],
      [
        500,
        687.25
      ],
      [
        393,
        794.25
      ],
      [
        286,
        687.25
      ],
      [
        393,
        580.25
      ],
      [
        339.5,
        526.75
      ],
      [
        232.5,
        633.75
      ],
      [
        232.5,
        205.75
      ],
      [
        339.5,
        312.75
      ],
      [
        767.5,
        312.75
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 553.5,
        "y": 598.08,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 455.42,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 303.83,
        "y": 491.08,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 687.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 660.5,
        "y": 348.42,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 268.17,
        "y": 312.75,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393,
        "y": 366.25,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          312.75
        ],
        [
          660.5,
          419.75
        ]
      ],
      [
        [
          767.5,
          526.75
        ],
        [
          339.5,
          526.75
        ]
      ],
      [
        [
          339.5,
          526.75
        ],
        [
          446.5,
          419.75
        ]
      ],
      [
        [
          446.5,
          419.75
        ],
        [
          553.5,
          312.75
        ]
      ],
      [
        [
          500,
          687.25
        ],
        [
          393,
          580.25
        ]
      ],
      [
        [
          446.5,
          419.75
        ],
        [
          232.5,
          419.75
        ]
      ],
      [
        [
          232.5,
          419.75
        ],
        [
          339.5,
          312.75
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": false
  },
  {
    "id": 50,
    "chapter": 5,
    "name": "静立人",
    "tip": "人物·动作 · 七块板拼出剪影",
    "outline": [
      [
        714,
        446.5
      ],
      [
        714,
        874.5
      ],
      [
        500,
        660.5
      ],
      [
        286,
        660.5
      ],
      [
        286,
        446.5
      ],
      [
        393,
        446.5
      ],
      [
        286,
        339.5
      ],
      [
        393,
        232.5
      ],
      [
        500,
        339.5
      ],
      [
        500,
        125.5
      ],
      [
        714,
        339.5
      ],
      [
        607,
        446.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 642.67,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 517.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 357.33,
        "y": 589.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 393,
        "y": 339.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 535.67,
        "y": 232.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 607,
        "y": 303.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 553.5,
        "y": 393,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          500,
          660.5
        ],
        [
          714,
          446.5
        ]
      ],
      [
        [
          393,
          446.5
        ],
        [
          607,
          446.5
        ]
      ],
      [
        [
          500,
          660.5
        ],
        [
          286,
          446.5
        ]
      ],
      [
        [
          500,
          339.5
        ],
        [
          714,
          339.5
        ]
      ],
      [
        [
          393,
          446.5
        ],
        [
          500,
          339.5
        ]
      ],
      [
        [
          500,
          339.5
        ],
        [
          607,
          232.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 210,
    "parSteps": 40,
    "needFlip": false
  },
  {
    "id": 51,
    "chapter": 6,
    "name": "帆船",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        259.25,
        607
      ],
      [
        312.75,
        553.5
      ],
      [
        205.75,
        446.5
      ],
      [
        312.75,
        339.5
      ],
      [
        419.75,
        446.5
      ],
      [
        687.25,
        179
      ],
      [
        687.25,
        286
      ],
      [
        794.25,
        393
      ],
      [
        794.25,
        607
      ],
      [
        687.25,
        500
      ],
      [
        687.25,
        607
      ],
      [
        794.25,
        714
      ],
      [
        580.25,
        714
      ],
      [
        473.25,
        821
      ],
      [
        473.25,
        607
      ],
      [
        366.25,
        714
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 615.92,
        "y": 393,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 473.25,
        "y": 535.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 544.58,
        "y": 678.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 312.75,
        "y": 446.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 366.25,
        "y": 642.67,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 687.25,
        "y": 678.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 740.75,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          473.25,
          393
        ],
        [
          687.25,
          607
        ]
      ],
      [
        [
          687.25,
          607
        ],
        [
          473.25,
          607
        ]
      ],
      [
        [
          473.25,
          607
        ],
        [
          259.25,
          607
        ]
      ],
      [
        [
          312.75,
          553.5
        ],
        [
          419.75,
          446.5
        ]
      ],
      [
        [
          687.25,
          286
        ],
        [
          687.25,
          500
        ]
      ],
      [
        [
          687.25,
          607
        ],
        [
          580.25,
          714
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 52,
    "chapter": 6,
    "name": "小舟",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        339.5,
        687.25
      ],
      [
        339.5,
        580.25
      ],
      [
        125.5,
        580.25
      ],
      [
        232.5,
        473.25
      ],
      [
        125.5,
        366.25
      ],
      [
        339.5,
        366.25
      ],
      [
        339.5,
        259.25
      ],
      [
        767.5,
        259.25
      ],
      [
        660.5,
        366.25
      ],
      [
        874.5,
        366.25
      ],
      [
        660.5,
        580.25
      ],
      [
        553.5,
        473.25
      ],
      [
        500,
        526.75
      ],
      [
        607,
        633.75
      ],
      [
        500,
        740.75
      ],
      [
        393,
        633.75
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 410.83,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 330.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 268.17,
        "y": 437.58,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500,
        "y": 633.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 660.5,
        "y": 508.92,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 232.5,
        "y": 544.58,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 714,
        "y": 419.75,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          339.5,
          580.25
        ],
        [
          339.5,
          366.25
        ]
      ],
      [
        [
          339.5,
          259.25
        ],
        [
          553.5,
          473.25
        ]
      ],
      [
        [
          500,
          526.75
        ],
        [
          393,
          633.75
        ]
      ],
      [
        [
          660.5,
          366.25
        ],
        [
          553.5,
          473.25
        ]
      ],
      [
        [
          339.5,
          580.25
        ],
        [
          232.5,
          473.25
        ]
      ],
      [
        [
          767.5,
          473.25
        ],
        [
          553.5,
          473.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 53,
    "chapter": 6,
    "name": "屋舍",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        607,
        393
      ],
      [
        607,
        500
      ],
      [
        821,
        500
      ],
      [
        607,
        714
      ],
      [
        607,
        821
      ],
      [
        500,
        714
      ],
      [
        286,
        714
      ],
      [
        286,
        500
      ],
      [
        179,
        393
      ],
      [
        393,
        393
      ],
      [
        286,
        286
      ],
      [
        500,
        286
      ],
      [
        607,
        179
      ],
      [
        714,
        286
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 393,
        "y": 464.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 535.67,
        "y": 607,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 678.33,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 286,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 321.67,
        "y": 607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 393,
        "y": 678.33,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 446.5,
        "y": 339.5,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          607
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          607,
          500
        ],
        [
          607,
          714
        ]
      ],
      [
        [
          500,
          714
        ],
        [
          393,
          607
        ]
      ],
      [
        [
          393,
          393
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          286,
          500
        ]
      ],
      [
        [
          500,
          286
        ],
        [
          607,
          393
        ]
      ],
      [
        [
          393,
          607
        ],
        [
          286,
          714
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": true
  },
  {
    "id": 54,
    "chapter": 6,
    "name": "拱桥",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        393,
        660.5
      ],
      [
        393,
        553.5
      ],
      [
        339.5,
        500
      ],
      [
        339.5,
        714
      ],
      [
        232.5,
        607
      ],
      [
        232.5,
        393
      ],
      [
        179,
        339.5
      ],
      [
        286,
        232.5
      ],
      [
        393,
        339.5
      ],
      [
        393,
        232.5
      ],
      [
        821,
        232.5
      ],
      [
        607,
        446.5
      ],
      [
        714,
        553.5
      ],
      [
        500,
        767.5
      ],
      [
        500,
        553.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 607,
        "y": 303.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 464.33,
        "y": 446.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 321.67,
        "y": 410.83,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 553.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 535.67,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 286,
        "y": 303.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 286,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          393,
          553.5
        ],
        [
          393,
          339.5
        ]
      ],
      [
        [
          393,
          232.5
        ],
        [
          607,
          446.5
        ]
      ],
      [
        [
          607,
          446.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          607,
          660.5
        ],
        [
          500,
          553.5
        ]
      ],
      [
        [
          339.5,
          500
        ],
        [
          232.5,
          393
        ]
      ],
      [
        [
          179,
          339.5
        ],
        [
          393,
          339.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 55,
    "chapter": 6,
    "name": "双轮车",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        393,
        767.5
      ],
      [
        393,
        660.5
      ],
      [
        179,
        660.5
      ],
      [
        286,
        553.5
      ],
      [
        179,
        446.5
      ],
      [
        393,
        232.5
      ],
      [
        393,
        339.5
      ],
      [
        500,
        232.5
      ],
      [
        607,
        339.5
      ],
      [
        821,
        339.5
      ],
      [
        607,
        553.5
      ],
      [
        714,
        660.5
      ],
      [
        607,
        767.5
      ],
      [
        500,
        660.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 464.33,
        "y": 553.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 607,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 321.67,
        "y": 589.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 303.83,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 250.33,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 339.5,
        "y": 393,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          660.5
        ],
        [
          393,
          446.5
        ]
      ],
      [
        [
          393,
          446.5
        ],
        [
          393,
          339.5
        ]
      ],
      [
        [
          393,
          339.5
        ],
        [
          607,
          553.5
        ]
      ],
      [
        [
          607,
          553.5
        ],
        [
          500,
          660.5
        ]
      ],
      [
        [
          393,
          339.5
        ],
        [
          607,
          339.5
        ]
      ],
      [
        [
          286,
          553.5
        ],
        [
          393,
          446.5
        ]
      ],
      [
        [
          286,
          553.5
        ],
        [
          286,
          339.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": true
  },
  {
    "id": 56,
    "chapter": 6,
    "name": "火箭",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        393,
        687.25
      ],
      [
        179,
        473.25
      ],
      [
        393,
        259.25
      ],
      [
        446.5,
        312.75
      ],
      [
        553.5,
        205.75
      ],
      [
        767.5,
        419.75
      ],
      [
        553.5,
        419.75
      ],
      [
        607,
        473.25
      ],
      [
        821,
        473.25
      ],
      [
        714,
        580.25
      ],
      [
        821,
        687.25
      ],
      [
        607,
        687.25
      ],
      [
        500,
        794.25
      ],
      [
        500,
        580.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 464.33,
        "y": 473.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 321.67,
        "y": 473.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 678.33,
        "y": 544.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 312.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 660.5,
        "y": 384.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 714,
        "y": 651.58,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 553.5,
        "y": 633.75,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          393,
          259.25
        ],
        [
          393,
          687.25
        ]
      ],
      [
        [
          446.5,
          312.75
        ],
        [
          553.5,
          419.75
        ]
      ],
      [
        [
          607,
          473.25
        ],
        [
          500,
          580.25
        ]
      ],
      [
        [
          607,
          473.25
        ],
        [
          607,
          687.25
        ]
      ],
      [
        [
          660.5,
          312.75
        ],
        [
          553.5,
          419.75
        ]
      ],
      [
        [
          714,
          580.25
        ],
        [
          607,
          687.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": true
  },
  {
    "id": 57,
    "chapter": 6,
    "name": "飞机",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        607,
        687.25
      ],
      [
        500,
        580.25
      ],
      [
        500,
        794.25
      ],
      [
        393,
        687.25
      ],
      [
        179,
        687.25
      ],
      [
        286,
        580.25
      ],
      [
        179,
        473.25
      ],
      [
        393,
        473.25
      ],
      [
        446.5,
        419.75
      ],
      [
        232.5,
        419.75
      ],
      [
        446.5,
        205.75
      ],
      [
        553.5,
        312.75
      ],
      [
        607,
        259.25
      ],
      [
        821,
        473.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 607,
        "y": 401.92,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 607,
        "y": 544.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 321.67,
        "y": 544.58,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 446.5,
        "y": 312.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 286,
        "y": 651.58,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 339.5,
        "y": 384.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 446.5,
        "y": 633.75,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          500,
          580.25
        ],
        [
          393,
          473.25
        ]
      ],
      [
        [
          393,
          473.25
        ],
        [
          821,
          473.25
        ]
      ],
      [
        [
          446.5,
          419.75
        ],
        [
          553.5,
          312.75
        ]
      ],
      [
        [
          393,
          687.25
        ],
        [
          393,
          473.25
        ]
      ],
      [
        [
          446.5,
          419.75
        ],
        [
          339.5,
          312.75
        ]
      ],
      [
        [
          393,
          687.25
        ],
        [
          286,
          580.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 58,
    "chapter": 6,
    "name": "灯塔",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        473.25,
        714
      ],
      [
        259.25,
        500
      ],
      [
        312.75,
        446.5
      ],
      [
        205.75,
        339.5
      ],
      [
        312.75,
        232.5
      ],
      [
        419.75,
        339.5
      ],
      [
        473.25,
        286
      ],
      [
        687.25,
        286
      ],
      [
        794.25,
        393
      ],
      [
        794.25,
        607
      ],
      [
        687.25,
        500
      ],
      [
        633.75,
        553.5
      ],
      [
        740.75,
        660.5
      ],
      [
        633.75,
        767.5
      ],
      [
        526.75,
        660.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 473.25,
        "y": 428.67,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 473.25,
        "y": 571.33,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 615.92,
        "y": 357.33,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 312.75,
        "y": 339.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 598.08,
        "y": 660.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 669.42,
        "y": 660.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 740.75,
        "y": 446.5,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          259.25,
          500
        ],
        [
          687.25,
          500
        ]
      ],
      [
        [
          633.75,
          553.5
        ],
        [
          526.75,
          660.5
        ]
      ],
      [
        [
          312.75,
          446.5
        ],
        [
          419.75,
          339.5
        ]
      ],
      [
        [
          473.25,
          286
        ],
        [
          687.25,
          500
        ]
      ],
      [
        [
          687.25,
          286
        ],
        [
          687.25,
          500
        ]
      ],
      [
        [
          633.75,
          553.5
        ],
        [
          633.75,
          767.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 59,
    "chapter": 6,
    "name": "塔楼",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        446.5,
        660.5
      ],
      [
        339.5,
        767.5
      ],
      [
        339.5,
        660.5
      ],
      [
        232.5,
        553.5
      ],
      [
        232.5,
        339.5
      ],
      [
        339.5,
        446.5
      ],
      [
        339.5,
        339.5
      ],
      [
        446.5,
        232.5
      ],
      [
        660.5,
        232.5
      ],
      [
        553.5,
        339.5
      ],
      [
        767.5,
        339.5
      ],
      [
        767.5,
        553.5
      ],
      [
        553.5,
        553.5
      ],
      [
        660.5,
        660.5
      ],
      [
        553.5,
        767.5
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 410.83,
        "y": 553.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 553.5,
        "y": 410.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 696.17,
        "y": 482.17,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.5,
        "y": 660.5,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 303.83,
        "y": 553.5,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 268.17,
        "y": 446.5,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 286,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          553.5,
          553.5
        ],
        [
          446.5,
          660.5
        ]
      ],
      [
        [
          339.5,
          660.5
        ],
        [
          339.5,
          446.5
        ]
      ],
      [
        [
          339.5,
          339.5
        ],
        [
          553.5,
          553.5
        ]
      ],
      [
        [
          339.5,
          339.5
        ],
        [
          553.5,
          339.5
        ]
      ],
      [
        [
          767.5,
          339.5
        ],
        [
          553.5,
          553.5
        ]
      ],
      [
        [
          232.5,
          553.5
        ],
        [
          339.5,
          446.5
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  },
  {
    "id": 60,
    "chapter": 6,
    "name": "难题剪影",
    "tip": "交通·挑战 · 七块板拼出剪影",
    "outline": [
      [
        580.25,
        633.75
      ],
      [
        152.25,
        633.75
      ],
      [
        419.75,
        366.25
      ],
      [
        205.75,
        366.25
      ],
      [
        312.75,
        259.25
      ],
      [
        526.75,
        259.25
      ],
      [
        580.25,
        205.75
      ],
      [
        580.25,
        419.75
      ],
      [
        687.25,
        312.75
      ],
      [
        794.25,
        419.75
      ],
      [
        740.75,
        473.25
      ],
      [
        847.75,
        580.25
      ],
      [
        633.75,
        794.25
      ],
      [
        633.75,
        580.25
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 508.92,
        "y": 419.75,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 366.25,
        "y": 562.42,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 651.58,
        "y": 491.08,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 740.75,
        "y": 580.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 687.25,
        "y": 384.08,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 669.42,
        "y": 687.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 366.25,
        "y": 312.75,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          366.25,
          419.75
        ],
        [
          580.25,
          633.75
        ]
      ],
      [
        [
          580.25,
          419.75
        ],
        [
          580.25,
          633.75
        ]
      ],
      [
        [
          419.75,
          366.25
        ],
        [
          526.75,
          259.25
        ]
      ],
      [
        [
          580.25,
          419.75
        ],
        [
          794.25,
          419.75
        ]
      ],
      [
        [
          740.75,
          473.25
        ],
        [
          633.75,
          580.25
        ]
      ],
      [
        [
          740.75,
          687.25
        ],
        [
          633.75,
          580.25
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 240,
    "parSteps": 44,
    "needFlip": false
  }
];
  /* 两套数据集并存：core.js 用 setKey 选择，四巧板仍走 FOUR.dataset / FOUR.levels。
   * 章节名 / 每章关数 / 胶囊短名 / 结算文案全部由数据集自带（后续新拼图类型同构扩展）。 */
  root.TANGRAM_SETS = {
    tangram4: { dataset: FOUR.dataset, levels: FOUR.levels,
      saveKey: 'tangram_save_v1', chapPer: 10,
      chapNames: ['热身', '进阶', '大师'], chapTitles: null,
      completeTitle: '四巧板全部完成', completeSub: '七巧板即将开启',
      tray: null, snapGrid: null },
    tangram7: { dataset: DATA7, levels: LEVELS7,
      saveKey: 'tangram7_save_v1', chapPer: 10,
      chapNames: ["几何·入门","动物·飞禽","动物·走兽","水族·爬行","人物·动作","交通·挑战"], chapTitles: ["几何","飞禽","走兽","水族","人物","交通"],
      completeTitle: '七巧板全部完成', completeSub: '全部 60 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
