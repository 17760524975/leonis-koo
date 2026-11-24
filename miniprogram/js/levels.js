/* 四巧板 v0.1 关卡数据 —— 由 tools/build_levels.js 生成，请勿手改
 * 坐标系：1000×1000 归一化（拼图区内部坐标系）
 * 板件几何单位为 u，1u = 130 世界单位
 * 每关 outline 均由求解器枚举「四块边对边贴合」得到并校验：
 *   覆盖率 ≥99%、重叠 <1%、面积误差 <0.1%
 * v0.8：由 120 关精简为 30 关（tools/trim_levels4.js 重新抽样生成）
 * v0.9：第 30 关固定为原 120 关「T 字型」（玩家点名保留）；其余按视觉复杂度重选、形状指纹去重
 * 1-2 关保留原最简单的两关，3..30 关按「凹角多、形状饱满」重排；每 10 关一章
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
      "id": 5,
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
      "id": 6,
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
      "id": 7,
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
      "id": 8,
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
      "id": 9,
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
      "id": 10,
      "chapter": 1,
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
      "id": 11,
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
      "id": 12,
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
      "id": 13,
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
      "id": 14,
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
      "id": 15,
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
      "id": 16,
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
      "id": 17,
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
      "id": 18,
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
      "id": 19,
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
      "id": 20,
      "chapter": 2,
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
      "id": 21,
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
      "id": 22,
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
      "id": 23,
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
      "id": 24,
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
      "id": 25,
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
      "id": 26,
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
      "id": 27,
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
      "id": 28,
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
      "id": 29,
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
    },
    {
      "id": 30,
      "chapter": 3,
      "name": "T 字型",
      "tip": "四巧板的招牌：横杠压在竖杠上，两个肩的凹角各只有一种填法",
      "outline": [
        [
          695,
          370
        ],
        [
          695,
          240
        ],
        [
          305,
          240
        ],
        [
          305,
          370
        ],
        [
          435,
          370
        ],
        [
          435,
          760
        ],
        [
          565,
          760
        ],
        [
          565,
          370
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 495.67,
          "y": 595.33,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "B",
          "x": 348.33,
          "y": 326.67,
          "angle": 0,
          "flipped": false
        },
        {
          "id": "C",
          "x": 624.58,
          "y": 294.17,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "D",
          "x": 481.04,
          "y": 332.08,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 114,
      "parSteps": 28,
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
    "name": "E",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        424.34,
        500.0
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 525.54,
        "y": 297.94,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 348.99,
        "y": 273.33,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 323.31,
        "y": 399.59,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 373.6,
        "y": 449.88,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 373.6,
        "y": 600.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 575.83,
        "y": 727.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 423.89,
        "y": 752.69,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          424.3,
          197.4
        ],
        [
          424.3,
          348.7
        ]
      ],
      [
        [
          424.3,
          348.7
        ],
        [
          424.3,
          500.0
        ]
      ],
      [
        [
          273.0,
          348.7
        ],
        [
          424.3,
          348.7
        ]
      ],
      [
        [
          273.0,
          500.0
        ],
        [
          424.3,
          348.7
        ]
      ],
      [
        [
          273.0,
          500.0
        ],
        [
          424.3,
          500.0
        ]
      ],
      [
        [
          424.3,
          651.3
        ],
        [
          575.7,
          802.6
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 12,
    "chapter": 2,
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        273.02,
        613.49
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        424.34,
        764.82
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        348.68,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        840.48
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        500.0,
        689.16
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        726.98,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        462.17
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        424.34,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        310.85
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        726.98,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        159.53
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ],
      [
        273.02,
        613.49
      ]
    ],
    "solution": [
      {
        "id": "S",
        "x": 651.8,
        "y": 235.5,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 373.6,
        "y": 260.11,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 525.54,
        "y": 260.11,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 525.54,
        "y": 562.92,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 348.99,
        "y": 462.34,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 373.6,
        "y": 613.21,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 449.57,
        "y": 789.76,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          575.7,
          159.5
        ],
        [
          575.7,
          310.9
        ]
      ],
      [
        [
          424.3,
          462.2
        ],
        [
          424.3,
          764.8
        ]
      ],
      [
        [
          273.0,
          613.5
        ],
        [
          424.3,
          462.2
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 13,
    "chapter": 2,
    "name": "N",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        575.66,
        500.0
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        802.65
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        726.98,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ]
    ],
    "solution": [
      {
        "id": "S",
        "x": 651.8,
        "y": 273.33,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 626.12,
        "y": 399.59,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 651.8,
        "y": 500.17,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 676.41,
        "y": 651.04,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 373.6,
        "y": 399.59,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 373.6,
        "y": 600.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 525.54,
        "y": 600.75,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          575.7,
          348.7
        ],
        [
          727.0,
          348.7
        ]
      ],
      [
        [
          575.7,
          500.0
        ],
        [
          727.0,
          348.7
        ]
      ],
      [
        [
          575.7,
          651.3
        ],
        [
          727.0,
          500.0
        ]
      ],
      [
        [
          575.7,
          500.0
        ],
        [
          575.7,
          651.3
        ]
      ],
      [
        [
          273.0,
          500.0
        ],
        [
          575.7,
          500.0
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 14,
    "chapter": 2,
    "name": "P",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        802.65
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        424.34,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        575.66,
        651.32
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        500.0
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        726.98,
        348.68
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        575.66,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        197.36
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ],
      [
        273.02,
        802.65
      ]
    ],
    "holes": [
      [
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          424.34,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          348.68
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          575.66,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ],
        [
          424.34,
          500.0
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 373.6,
        "y": 297.94,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 575.83,
        "y": 297.94,
        "angle": 315,
        "flipped": true
      },
      {
        "id": "S",
        "x": 651.8,
        "y": 424.2,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 575.83,
        "y": 576.14,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 373.6,
        "y": 449.88,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 373.6,
        "y": 600.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 373.6,
        "y": 752.69,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          424.3,
          348.7
        ],
        [
          575.7,
          197.4
        ]
      ],
      [
        [
          273.0,
          500.0
        ],
        [
          424.3,
          348.7
        ]
      ],
      [
        [
          575.7,
          348.7
        ],
        [
          727.0,
          348.7
        ]
      ],
      [
        [
          575.7,
          500.0
        ],
        [
          727.0,
          500.0
        ]
      ],
      [
        [
          273.0,
          500.0
        ],
        [
          424.3,
          500.0
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 15,
    "chapter": 2,
    "name": "V",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        310.85,
        500.0
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        235.19,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        386.51,
        575.66
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        310.85,
        651.32
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        462.17,
        802.65
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        500.0
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        764.81,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        197.36
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        613.49,
        348.68
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        537.83,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        386.51,
        424.34
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        348.68
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        462.17,
        197.36
      ],
      [
        310.85,
        197.36
      ],
      [
        310.85,
        197.36
      ]
    ],
    "solution": [
      {
        "id": "T4",
        "x": 664.26,
        "y": 247.65,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 664.26,
        "y": 399.59,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 386.06,
        "y": 273.33,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 562.61,
        "y": 600.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 361.45,
        "y": 399.59,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 386.06,
        "y": 500.17,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T3",
        "x": 411.74,
        "y": 651.04,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          613.5,
          348.7
        ],
        [
          764.8,
          197.4
        ]
      ],
      [
        [
          462.2,
          500.0
        ],
        [
          764.8,
          500.0
        ]
      ],
      [
        [
          512.6,
          449.6
        ],
        [
          537.8,
          424.3
        ]
      ],
      [
        [
          310.9,
          348.7
        ],
        [
          462.2,
          348.7
        ]
      ],
      [
        [
          462.2,
          500.0
        ],
        [
          462.2,
          802.6
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  }
];
  /* 两套数据集并存：core.js 用 setKey 选择，四巧板仍走 FOUR.dataset / FOUR.levels。
   * 章节名 / 每章关数 / 胶囊短名 / 结算文案全部由数据集自带（后续新拼图类型同构扩展）。 */
  root.TANGRAM_SETS = {
    tangram4: { dataset: FOUR.dataset, levels: FOUR.levels,
      saveKey: 'tangram_save_v1', chapPer: 20,
      chapNames: ['启蒙', '熟悉', '转折', '嵌套', '交错', '硬骨头'], chapTitles: null,
      completeTitle: '四巧板全部完成', completeSub: '七巧板即将开启',
      tray: null, snapGrid: null },
    tangram7: { dataset: DATA7, levels: LEVELS7,
      saveKey: 'tangram7_save_v1', chapPer: 10,
      chapNames: ["几何·入门","字母·七巧"], chapTitles: ["几何","字母"],
      completeTitle: '七巧板全部完成', completeSub: '全部 15 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
