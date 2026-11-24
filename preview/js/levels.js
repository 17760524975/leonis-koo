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
  "unitScale": 96,
  "pieceOrder": [
    "T1",
    "T2",
    "T3",
    "S",
    "T4",
    "T5",
    "P"
  ],
  "snapGrid": 48,
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
        308.0,
        308.0
      ],
      [
        692.0,
        308.0
      ],
      [
        692.0,
        692.0
      ],
      [
        308.0,
        692.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500.0,
        "y": 372.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372.0,
        "y": 500.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 628.0,
        "y": 628.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596.0,
        "y": 500.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500.0,
        "y": 564.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660.0,
        "y": 404.0,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 452.0,
        "y": 644.0,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          692.0,
          308.0
        ],
        [
          596.0,
          404.0
        ]
      ],
      [
        [
          596.0,
          404.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          308.0,
          308.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          404.0,
          596.0
        ]
      ],
      [
        [
          404.0,
          596.0
        ],
        [
          308.0,
          692.0
        ]
      ],
      [
        [
          500.0,
          692.0
        ],
        [
          596.0,
          596.0
        ]
      ],
      [
        [
          596.0,
          596.0
        ],
        [
          692.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          596.0,
          596.0
        ]
      ],
      [
        [
          596.0,
          596.0
        ],
        [
          404.0,
          596.0
        ]
      ],
      [
        [
          692.0,
          500.0
        ],
        [
          596.0,
          404.0
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
        692.0,
        500.0
      ],
      [
        308.0,
        884.0
      ],
      [
        308.0,
        116.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500.0,
        "y": 564.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372.0,
        "y": 692.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 372.0,
        "y": 436.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404.0,
        "y": 308.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500.0,
        "y": 372.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 340.0,
        "y": 212.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 548.0,
        "y": 452.0,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          308.0,
          500.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          692.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          692.0
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          308.0
        ],
        [
          404.0,
          404.0
        ]
      ],
      [
        [
          404.0,
          404.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          596.0,
          404.0
        ],
        [
          404.0,
          404.0
        ]
      ],
      [
        [
          404.0,
          404.0
        ],
        [
          500.0,
          308.0
        ]
      ],
      [
        [
          404.0,
          212.0
        ],
        [
          308.0,
          308.0
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
        500.0,
        308.0
      ],
      [
        884.0,
        308.0
      ],
      [
        500.0,
        692.0
      ],
      [
        116.0,
        692.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 692.0,
        "y": 372.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 564.0,
        "y": 500.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 436.0,
        "y": 628.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404.0,
        "y": 500.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 308.0,
        "y": 564.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 468.0,
        "y": 404.0,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 260.0,
        "y": 644.0,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          692.0,
          500.0
        ],
        [
          500.0,
          308.0
        ]
      ],
      [
        [
          500.0,
          692.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          500.0,
          308.0
        ]
      ],
      [
        [
          308.0,
          692.0
        ],
        [
          404.0,
          596.0
        ]
      ],
      [
        [
          404.0,
          596.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          500.0
        ],
        [
          404.0,
          596.0
        ]
      ],
      [
        [
          404.0,
          596.0
        ],
        [
          212.0,
          596.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          404.0,
          404.0
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
        308.0,
        172.24
      ],
      [
        692.0,
        172.24
      ],
      [
        579.53,
        284.71
      ],
      [
        579.53,
        827.76
      ],
      [
        308.0,
        556.24
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500.0,
        "y": 236.23,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372.0,
        "y": 364.24,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 398.51,
        "y": 556.24,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 511.65,
        "y": 488.35,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 534.27,
        "y": 601.49,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 534.27,
        "y": 375.22,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 511.65,
        "y": 692.0,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          579.53,
          284.71
        ],
        [
          500.0,
          364.24
        ]
      ],
      [
        [
          500.0,
          364.24
        ],
        [
          308.0,
          172.24
        ]
      ],
      [
        [
          500.0,
          364.24
        ],
        [
          443.76,
          420.47
        ]
      ],
      [
        [
          443.76,
          420.47
        ],
        [
          308.0,
          556.24
        ]
      ],
      [
        [
          443.76,
          420.47
        ],
        [
          443.76,
          556.24
        ]
      ],
      [
        [
          443.76,
          556.24
        ],
        [
          443.76,
          692.0
        ]
      ],
      [
        [
          579.53,
          692.0
        ],
        [
          443.76,
          556.24
        ]
      ],
      [
        [
          443.76,
          556.24
        ],
        [
          579.53,
          556.24
        ]
      ],
      [
        [
          579.53,
          420.47
        ],
        [
          443.76,
          420.47
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
        443.76,
        228.47
      ],
      [
        827.76,
        228.47
      ],
      [
        443.76,
        612.47
      ],
      [
        443.76,
        771.53
      ],
      [
        308.0,
        635.76
      ],
      [
        172.24,
        500.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 635.76,
        "y": 292.47,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 507.76,
        "y": 420.47,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 262.75,
        "y": 500.0,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 375.88,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 398.51,
        "y": 545.25,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 398.51,
        "y": 318.98,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 375.88,
        "y": 635.76,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          635.76,
          420.47
        ],
        [
          443.76,
          228.47
        ]
      ],
      [
        [
          443.76,
          612.47
        ],
        [
          443.76,
          500.0
        ]
      ],
      [
        [
          443.76,
          500.0
        ],
        [
          443.76,
          364.24
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          443.76,
          228.47
        ]
      ],
      [
        [
          308.0,
          364.24
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          500.0
        ],
        [
          308.0,
          635.76
        ]
      ],
      [
        [
          443.76,
          635.76
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          500.0
        ],
        [
          443.76,
          500.0
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          308.0,
          364.24
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
        443.76,
        251.76
      ],
      [
        827.76,
        251.76
      ],
      [
        443.76,
        635.76
      ],
      [
        443.76,
        771.53
      ],
      [
        308.0,
        635.76
      ],
      [
        172.24,
        500.0
      ],
      [
        443.76,
        228.47
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 635.76,
        "y": 315.76,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 507.76,
        "y": 443.76,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 262.75,
        "y": 500.0,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 375.88,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 398.51,
        "y": 545.25,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 398.51,
        "y": 318.98,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 375.88,
        "y": 635.76,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          635.76,
          443.76
        ],
        [
          443.76,
          251.76
        ]
      ],
      [
        [
          443.76,
          635.76
        ],
        [
          443.76,
          500.0
        ]
      ],
      [
        [
          443.76,
          500.0
        ],
        [
          443.76,
          364.24
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          443.76,
          251.76
        ]
      ],
      [
        [
          308.0,
          364.24
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          500.0
        ],
        [
          308.0,
          635.76
        ]
      ],
      [
        [
          443.76,
          635.76
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          308.0,
          500.0
        ],
        [
          443.76,
          500.0
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          308.0,
          364.24
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
        443.76,
        443.76
      ],
      [
        827.76,
        443.76
      ],
      [
        443.76,
        827.76
      ],
      [
        443.76,
        715.29
      ],
      [
        308.0,
        579.53
      ],
      [
        172.24,
        443.76
      ],
      [
        308.0,
        308.0
      ],
      [
        443.76,
        172.24
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 635.76,
        "y": 507.76,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 507.76,
        "y": 635.76,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 262.75,
        "y": 443.76,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 375.88,
        "y": 375.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 398.51,
        "y": 489.02,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 398.51,
        "y": 262.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 375.88,
        "y": 579.53,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          635.76,
          635.76
        ],
        [
          443.76,
          443.76
        ]
      ],
      [
        [
          443.76,
          715.29
        ],
        [
          443.76,
          579.53
        ]
      ],
      [
        [
          443.76,
          579.53
        ],
        [
          443.76,
          443.76
        ]
      ],
      [
        [
          308.0,
          308.0
        ],
        [
          308.0,
          443.76
        ]
      ],
      [
        [
          308.0,
          443.76
        ],
        [
          308.0,
          579.53
        ]
      ],
      [
        [
          443.76,
          579.53
        ],
        [
          308.0,
          443.76
        ]
      ],
      [
        [
          308.0,
          443.76
        ],
        [
          443.76,
          443.76
        ]
      ],
      [
        [
          443.76,
          308.0
        ],
        [
          308.0,
          308.0
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
        884.0,
        308.0
      ],
      [
        500.0,
        692.0
      ],
      [
        116.0,
        308.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 692.0,
        "y": 372.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 564.0,
        "y": 500.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 436.0,
        "y": 372.0,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404.0,
        "y": 500.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 308.0,
        "y": 436.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 468.0,
        "y": 596.0,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 260.0,
        "y": 356.0,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          692.0,
          500.0
        ],
        [
          500.0,
          308.0
        ]
      ],
      [
        [
          500.0,
          692.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          500.0,
          308.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          404.0,
          404.0
        ]
      ],
      [
        [
          404.0,
          404.0
        ],
        [
          308.0,
          308.0
        ]
      ],
      [
        [
          212.0,
          404.0
        ],
        [
          404.0,
          404.0
        ]
      ],
      [
        [
          404.0,
          404.0
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          404.0,
          596.0
        ],
        [
          500.0,
          500.0
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
        692.0,
        500.0
      ],
      [
        308.0,
        884.0
      ],
      [
        308.0,
        500.0
      ],
      [
        692.0,
        116.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500.0,
        "y": 564.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372.0,
        "y": 692.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 628.0,
        "y": 436.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596.0,
        "y": 308.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500.0,
        "y": 372.0,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660.0,
        "y": 212.0,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 452.0,
        "y": 452.0,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          308.0,
          500.0
        ],
        [
          500.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          692.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          692.0
        ],
        [
          308.0,
          500.0
        ]
      ],
      [
        [
          500.0,
          500.0
        ],
        [
          596.0,
          404.0
        ]
      ],
      [
        [
          596.0,
          404.0
        ],
        [
          692.0,
          308.0
        ]
      ],
      [
        [
          500.0,
          308.0
        ],
        [
          596.0,
          404.0
        ]
      ],
      [
        [
          596.0,
          404.0
        ],
        [
          404.0,
          404.0
        ]
      ],
      [
        [
          692.0,
          308.0
        ],
        [
          596.0,
          212.0
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
        172.24,
        308.0
      ],
      [
        556.24,
        308.0
      ],
      [
        827.76,
        579.53
      ],
      [
        284.71,
        579.53
      ],
      [
        172.24,
        692.0
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 364.24,
        "y": 372.0,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 236.23,
        "y": 500.0,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 556.24,
        "y": 398.51,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 624.12,
        "y": 511.65,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 510.98,
        "y": 534.27,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 737.25,
        "y": 534.27,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 420.47,
        "y": 511.65,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          556.24,
          308.0
        ],
        [
          420.47,
          443.76
        ]
      ],
      [
        [
          420.47,
          443.76
        ],
        [
          364.24,
          500.0
        ]
      ],
      [
        [
          364.24,
          500.0
        ],
        [
          172.24,
          308.0
        ]
      ],
      [
        [
          364.24,
          500.0
        ],
        [
          284.71,
          579.53
        ]
      ],
      [
        [
          692.0,
          443.76
        ],
        [
          556.24,
          443.76
        ]
      ],
      [
        [
          556.24,
          443.76
        ],
        [
          420.47,
          443.76
        ]
      ],
      [
        [
          420.47,
          579.53
        ],
        [
          556.24,
          443.76
        ]
      ],
      [
        [
          556.24,
          443.76
        ],
        [
          556.24,
          579.53
        ]
      ],
      [
        [
          692.0,
          579.53
        ],
        [
          692.0,
          443.76
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
    "name": "A",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        500.0
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        567.89,
        771.53
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        635.76
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        432.12,
        228.47
      ],
      [
        296.36,
        364.23
      ],
      [
        296.36,
        364.23
      ]
    ],
    "holes": [
      [
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ]
      ]
    ],
    "solution": [
      {
        "id": "P",
        "x": 568.04,
        "y": 296.63,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.16,
        "y": 409.91,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 613.16,
        "y": 545.27,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 431.72,
        "y": 318.71,
        "angle": 315,
        "flipped": true
      },
      {
        "id": "S",
        "x": 364.52,
        "y": 431.99,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.6,
        "y": 590.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.16,
        "y": 680.63,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          364.2
        ],
        [
          703.6,
          364.2
        ]
      ],
      [
        [
          432.1,
          228.5
        ],
        [
          567.9,
          364.2
        ]
      ],
      [
        [
          567.9,
          635.8
        ],
        [
          703.6,
          635.8
        ]
      ],
      [
        [
          296.4,
          364.2
        ],
        [
          432.1,
          364.2
        ]
      ],
      [
        [
          296.4,
          500.0
        ],
        [
          432.1,
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
    "id": 12,
    "chapter": 2,
    "name": "E",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        432.12,
        500.0
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 522.92,
        "y": 318.71,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.52,
        "y": 296.63,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 341.48,
        "y": 409.91,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.6,
        "y": 455.03,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.6,
        "y": 590.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.04,
        "y": 703.67,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 431.72,
        "y": 726.71,
        "angle": 315,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          432.1,
          228.5
        ],
        [
          432.1,
          364.2
        ]
      ],
      [
        [
          432.1,
          364.2
        ],
        [
          432.1,
          500.0
        ]
      ],
      [
        [
          296.4,
          364.2
        ],
        [
          432.1,
          364.2
        ]
      ],
      [
        [
          296.4,
          500.0
        ],
        [
          432.1,
          364.2
        ]
      ],
      [
        [
          296.4,
          500.0
        ],
        [
          432.1,
          500.0
        ]
      ],
      [
        [
          432.1,
          635.8
        ],
        [
          567.9,
          771.5
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 13,
    "chapter": 2,
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        296.36,
        601.82
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        432.12,
        737.59
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        364.24,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        805.47
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        500.0,
        669.71
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        703.65,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        466.06
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        432.12,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        330.29
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        703.65,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        194.53
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ],
      [
        296.36,
        601.82
      ]
    ],
    "solution": [
      {
        "id": "S",
        "x": 636.2,
        "y": 262.69,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 386.6,
        "y": 284.77,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 522.92,
        "y": 284.77,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 522.92,
        "y": 556.45,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 364.52,
        "y": 466.21,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 386.6,
        "y": 601.57,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 454.76,
        "y": 759.97,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          194.5
        ],
        [
          567.9,
          330.3
        ]
      ],
      [
        [
          432.1,
          466.1
        ],
        [
          432.1,
          737.6
        ]
      ],
      [
        [
          296.4,
          601.8
        ],
        [
          432.1,
          466.1
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
    "name": "L",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        296.35
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        296.36,
        432.12
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        500.0
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        364.24,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        635.77,
        771.53
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        839.42
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        703.65,
        567.88
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        703.65
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        567.89,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        567.89,
        296.35
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        296.36,
        160.59
      ],
      [
        296.36,
        160.59
      ]
    ],
    "solution": [
      {
        "id": "S",
        "x": 364.52,
        "y": 228.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 477.8,
        "y": 250.83,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 431.72,
        "y": 364.11,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T5",
        "x": 341.48,
        "y": 342.03,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 477.8,
        "y": 522.51,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 658.28,
        "y": 703.95,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 454.76,
        "y": 680.91,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          432.1,
          160.6
        ],
        [
          432.1,
          296.4
        ]
      ],
      [
        [
          296.4,
          296.4
        ],
        [
          432.1,
          296.4
        ]
      ],
      [
        [
          432.1,
          296.4
        ],
        [
          567.9,
          296.4
        ]
      ],
      [
        [
          296.4,
          432.1
        ],
        [
          432.1,
          296.4
        ]
      ],
      [
        [
          296.4,
          432.1
        ],
        [
          432.1,
          432.1
        ]
      ],
      [
        [
          364.2,
          500.0
        ],
        [
          567.9,
          703.6
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
    "name": "N",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        567.89,
        500.0
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        771.53
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        703.65,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ]
    ],
    "solution": [
      {
        "id": "S",
        "x": 636.2,
        "y": 296.63,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.16,
        "y": 409.91,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 636.2,
        "y": 500.15,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 658.28,
        "y": 635.51,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 386.6,
        "y": 409.91,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.6,
        "y": 590.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.92,
        "y": 590.39,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          364.2
        ],
        [
          703.6,
          364.2
        ]
      ],
      [
        [
          567.9,
          500.0
        ],
        [
          703.6,
          364.2
        ]
      ],
      [
        [
          567.9,
          635.8
        ],
        [
          703.6,
          500.0
        ]
      ],
      [
        [
          567.9,
          500.0
        ],
        [
          567.9,
          635.8
        ]
      ],
      [
        [
          296.4,
          500.0
        ],
        [
          567.9,
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
    "id": 16,
    "chapter": 2,
    "name": "P",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        771.53
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.12,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        432.13,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        567.89,
        635.76
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        500.0
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        703.65,
        364.23
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        567.89,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        228.47
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ],
      [
        296.36,
        771.53
      ]
    ],
    "holes": [
      [
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          432.12,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          364.23
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          567.89,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ],
        [
          432.12,
          500.0
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.6,
        "y": 318.71,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 568.04,
        "y": 318.71,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 636.2,
        "y": 431.99,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.04,
        "y": 568.31,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 386.6,
        "y": 455.03,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.6,
        "y": 590.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.6,
        "y": 726.71,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          364.2
        ],
        [
          703.6,
          364.2
        ]
      ],
      [
        [
          567.9,
          500.0
        ],
        [
          703.6,
          500.0
        ]
      ],
      [
        [
          296.4,
          500.0
        ],
        [
          432.1,
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
    "id": 17,
    "chapter": 2,
    "name": "V",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        330.29,
        500.0
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        262.41,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        398.17,
        567.88
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        330.29,
        635.76
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        466.05,
        771.53
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        500.0
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        737.58,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        228.47
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        601.82,
        364.23
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        533.94,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        398.17,
        432.11
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        364.23
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        466.05,
        228.47
      ],
      [
        330.29,
        228.47
      ],
      [
        330.29,
        228.47
      ]
    ],
    "solution": [
      {
        "id": "T4",
        "x": 647.37,
        "y": 273.59,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T1",
        "x": 647.37,
        "y": 409.91,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 397.77,
        "y": 296.63,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 556.17,
        "y": 590.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 375.69,
        "y": 409.91,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 397.77,
        "y": 500.15,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T3",
        "x": 420.81,
        "y": 635.51,
        "angle": 315,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          466.1,
          500.0
        ],
        [
          737.6,
          500.0
        ]
      ],
      [
        [
          466.1,
          500.0
        ],
        [
          533.9,
          432.1
        ]
      ],
      [
        [
          330.3,
          364.2
        ],
        [
          466.1,
          364.2
        ]
      ],
      [
        [
          466.1,
          500.0
        ],
        [
          466.1,
          771.5
        ]
      ],
      [
        [
          398.2,
          567.9
        ],
        [
          466.1,
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
    "id": 18,
    "chapter": 2,
    "name": "Y",
    "tip": "字母·七巧 · 七块板拼出字母",
    "outline": [
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        160.59,
        160.59
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        432.12
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        432.12,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        296.35,
        703.65
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        432.12,
        839.42
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        703.65
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        567.88,
        432.12
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        839.42,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        160.59
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        567.88,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        296.35
      ],
      [
        432.12,
        160.59
      ],
      [
        432.12,
        160.59
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 658.83,
        "y": 250.83,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 342.03,
        "y": 250.83,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 477.39,
        "y": 342.03,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500.43,
        "y": 432.27,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.51,
        "y": 522.51,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500.43,
        "y": 635.79,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.27,
        "y": 749.07,
        "angle": 225,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          296.4
        ],
        [
          567.9,
          432.1
        ]
      ],
      [
        [
          432.1,
          296.4
        ],
        [
          432.1,
          432.1
        ]
      ],
      [
        [
          432.1,
          432.1
        ],
        [
          567.9,
          296.4
        ]
      ],
      [
        [
          432.1,
          567.9
        ],
        [
          567.9,
          432.1
        ]
      ],
      [
        [
          432.1,
          567.9
        ],
        [
          567.9,
          567.9
        ]
      ],
      [
        [
          432.1,
          703.6
        ],
        [
          567.9,
          703.6
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
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
      completeTitle: '七巧板全部完成', completeSub: '全部 18 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
