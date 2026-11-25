/* 四巧板 v0.1 关卡数据 —— 由 tools/build_levels.js 生成，请勿手改
 * 坐标系：1000×1000 归一化（拼图区内部坐标系）
 * 板件几何单位为 u，1u = 130 世界单位
 * 每关 outline 均由求解器枚举「四块边对边贴合」得到并校验：
 *   覆盖率 ≥99%、重叠 <1%、面积误差 <0.1%
 * v0.8：由 120 关精简为 30 关（tools/trim_levels4.js 重新抽样生成）
 * v0.9：第 30 关固定为原 120 关「T 字型」（玩家点名保留）；其余按视觉复杂度重选、形状指纹去重
 * 1-2 关保留原最简单的两关，3..30 关按「凹角多、形状饱满」重排；每 10 关一章
 * v0.45：第二章（原 11-20 关）之后追加 6 关「参考图」关卡，id 21-26；
 *        原第三章 21-30 顺延为 27-36，四巧板共 36 关。6 关轮廓均由 4 块板的并集反推，必然可解
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
      "chapter": 2,
      "name": "",
      "tip": "斜着看，凹口只有一种填法",
      "outline": [
        [
          427.11,
          610.96
        ],
        [
          335.19,
          519.04
        ],
        [
          519.04,
          335.19
        ],
        [
          702.89,
          335.19
        ],
        [
          702.89,
          519.04
        ],
        [
          610.96,
          610.96
        ],
        [
          702.89,
          702.89
        ],
        [
          335.19,
          702.89
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 500.65,
          "y": 451.63,
          "angle": 135,
          "flipped": false
        },
        {
          "id": "D",
          "x": 524.78,
          "y": 643.52,
          "angle": 135,
          "flipped": false
        },
        {
          "id": "C",
          "x": 653.09,
          "y": 461.59,
          "angle": 315,
          "flipped": false
        },
        {
          "id": "B",
          "x": 565,
          "y": 534.36,
          "angle": 135,
          "flipped": false
        }
      ],
      "parTime": 105,
      "parSteps": 25,
      "needFlip": false
    },
    {
      "id": 22,
      "chapter": 2,
      "name": "",
      "tip": "先把最深那条凹槽填掉",
      "outline": [
        [
          435,
          305
        ],
        [
          435,
          435
        ],
        [
          565,
          435
        ],
        [
          565,
          305
        ],
        [
          695,
          305
        ],
        [
          695,
          695
        ],
        [
          565,
          565
        ],
        [
          435,
          565
        ],
        [
          305,
          695
        ],
        [
          305,
          305
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 365.67,
          "y": 469.67,
          "angle": 270,
          "flipped": false
        },
        {
          "id": "D",
          "x": 602.92,
          "y": 518.96,
          "angle": 270,
          "flipped": true
        },
        {
          "id": "C",
          "x": 640.83,
          "y": 375.42,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "B",
          "x": 478.33,
          "y": 521.67,
          "angle": 0,
          "flipped": false
        }
      ],
      "parTime": 105,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 23,
      "chapter": 2,
      "name": "",
      "tip": "两个尖角各占一块，别急着动大梯形",
      "outline": [
        [
          695,
          305
        ],
        [
          695,
          695
        ],
        [
          565,
          695
        ],
        [
          565,
          630
        ],
        [
          435,
          630
        ],
        [
          435,
          695
        ],
        [
          305,
          565
        ],
        [
          240,
          565
        ],
        [
          500,
          305
        ],
        [
          500,
          435
        ],
        [
          565,
          435
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 634.33,
          "y": 530.33,
          "angle": 90,
          "flipped": false
        },
        {
          "id": "D",
          "x": 416.04,
          "y": 472.92,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "C",
          "x": 510.83,
          "y": 559.58,
          "angle": 90,
          "flipped": true
        },
        {
          "id": "B",
          "x": 391.67,
          "y": 608.33,
          "angle": 180,
          "flipped": false
        }
      ],
      "parTime": 105,
      "parSteps": 25,
      "needFlip": true
    },
    {
      "id": 24,
      "chapter": 2,
      "name": "",
      "tip": "上下两条横带，中间靠一块斜的接起来",
      "outline": [
        [
          240,
          370
        ],
        [
          630,
          370
        ],
        [
          630,
          500
        ],
        [
          760,
          500
        ],
        [
          760,
          630
        ],
        [
          370,
          630
        ],
        [
          370,
          500
        ],
        [
          240,
          500
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 404.67,
          "y": 430.67,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "D",
          "x": 546.04,
          "y": 537.92,
          "angle": 0,
          "flipped": true
        },
        {
          "id": "C",
          "x": 689.58,
          "y": 575.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 413.33,
          "y": 543.33,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 106,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 25,
      "chapter": 2,
      "name": "",
      "tip": "窄缝比看上去宽，先塞小三角",
      "outline": [
        [
          710.77,
          565
        ],
        [
          618.85,
          656.92
        ],
        [
          572.89,
          610.96
        ],
        [
          480.96,
          702.89
        ],
        [
          435,
          656.92
        ],
        [
          251.15,
          656.92
        ],
        [
          297.11,
          610.96
        ],
        [
          297.11,
          427.11
        ],
        [
          435,
          289.23
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 551.44,
          "y": 491.46,
          "angle": 45,
          "flipped": false
        },
        {
          "id": "D",
          "x": 375.63,
          "y": 478.82,
          "angle": 135,
          "flipped": true
        },
        {
          "id": "C",
          "x": 484.79,
          "y": 599.47,
          "angle": 45,
          "flipped": true
        },
        {
          "id": "B",
          "x": 343.08,
          "y": 626.28,
          "angle": 135,
          "flipped": false
        }
      ],
      "parTime": 106,
      "parSteps": 26,
      "needFlip": true
    },
    {
      "id": 26,
      "chapter": 2,
      "name": "",
      "tip": "中间那道斜槽是关键，先放进去的那块最省事",
      "outline": [
        [
          240,
          695
        ],
        [
          240,
          565
        ],
        [
          500,
          565
        ],
        [
          370,
          435
        ],
        [
          435,
          435
        ],
        [
          435,
          305
        ],
        [
          630,
          305
        ],
        [
          630,
          435
        ],
        [
          565,
          435
        ],
        [
          695,
          565
        ],
        [
          630,
          565
        ],
        [
          630,
          695
        ]
      ],
      "solution": [
        {
          "id": "A",
          "x": 404.67,
          "y": 634.33,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "D",
          "x": 546.04,
          "y": 527.08,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "C",
          "x": 559.58,
          "y": 380.83,
          "angle": 180,
          "flipped": false
        },
        {
          "id": "B",
          "x": 478.33,
          "y": 348.33,
          "angle": 90,
          "flipped": false
        }
      ],
      "parTime": 106,
      "parSteps": 26,
      "needFlip": false
    },
    {
      "id": 27,
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
      "id": 28,
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
      "id": 29,
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
      "id": 30,
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
      "id": 31,
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
      "id": 32,
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
      "id": 33,
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
      "id": 34,
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
      "id": 35,
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
      "id": 36,
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
        308,
        308
      ],
      [
        692,
        308
      ],
      [
        692,
        692
      ],
      [
        308,
        692
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 628,
        "y": 628,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 564,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660,
        "y": 404,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 452,
        "y": 644,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          692,
          308
        ],
        [
          596,
          404
        ]
      ],
      [
        [
          596,
          404
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
          308,
          308
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          404,
          596
        ]
      ],
      [
        [
          404,
          596
        ],
        [
          308,
          692
        ]
      ],
      [
        [
          500,
          692
        ],
        [
          596,
          596
        ]
      ],
      [
        [
          596,
          596
        ],
        [
          692,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          596,
          596
        ]
      ],
      [
        [
          596,
          596
        ],
        [
          404,
          596
        ]
      ],
      [
        [
          692,
          500
        ],
        [
          596,
          404
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
        692,
        500
      ],
      [
        308,
        884
      ],
      [
        308,
        116
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 564,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372,
        "y": 692,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 372,
        "y": 436,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404,
        "y": 308,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 372,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 340,
        "y": 212,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 548,
        "y": 452,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          308,
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
          692,
          500
        ]
      ],
      [
        [
          500,
          692
        ],
        [
          308,
          500
        ]
      ],
      [
        [
          308,
          308
        ],
        [
          404,
          404
        ]
      ],
      [
        [
          404,
          404
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          596,
          404
        ],
        [
          404,
          404
        ]
      ],
      [
        [
          404,
          404
        ],
        [
          500,
          308
        ]
      ],
      [
        [
          404,
          212
        ],
        [
          308,
          308
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
        308
      ],
      [
        884,
        308
      ],
      [
        500,
        692
      ],
      [
        116,
        692
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 692,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 564,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 436,
        "y": 628,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404,
        "y": 500,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 308,
        "y": 564,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 468,
        "y": 404,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 260,
        "y": 644,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          692,
          500
        ],
        [
          500,
          308
        ]
      ],
      [
        [
          500,
          692
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
          308
        ]
      ],
      [
        [
          308,
          692
        ],
        [
          404,
          596
        ]
      ],
      [
        [
          404,
          596
        ],
        [
          500,
          500
        ]
      ],
      [
        [
          308,
          500
        ],
        [
          404,
          596
        ]
      ],
      [
        [
          404,
          596
        ],
        [
          212,
          596
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          404,
          404
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
        308,
        172.24
      ],
      [
        692,
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
        308,
        556.24
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 236.23,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 372,
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
        "y": 692,
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
          500,
          364.24
        ]
      ],
      [
        [
          500,
          364.24
        ],
        [
          308,
          172.24
        ]
      ],
      [
        [
          500,
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
          308,
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
          692
        ]
      ],
      [
        [
          579.53,
          692
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
        308,
        635.76
      ],
      [
        172.24,
        500
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
        "y": 500,
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
          500
        ]
      ],
      [
        [
          443.76,
          500
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
          308,
          364.24
        ],
        [
          308,
          500
        ]
      ],
      [
        [
          308,
          500
        ],
        [
          308,
          635.76
        ]
      ],
      [
        [
          443.76,
          635.76
        ],
        [
          308,
          500
        ]
      ],
      [
        [
          308,
          500
        ],
        [
          443.76,
          500
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          308,
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
        308,
        635.76
      ],
      [
        172.24,
        500
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
        "y": 500,
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
          500
        ]
      ],
      [
        [
          443.76,
          500
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
          308,
          364.24
        ],
        [
          308,
          500
        ]
      ],
      [
        [
          308,
          500
        ],
        [
          308,
          635.76
        ]
      ],
      [
        [
          443.76,
          635.76
        ],
        [
          308,
          500
        ]
      ],
      [
        [
          308,
          500
        ],
        [
          443.76,
          500
        ]
      ],
      [
        [
          443.76,
          364.24
        ],
        [
          308,
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
        308,
        579.53
      ],
      [
        172.24,
        443.76
      ],
      [
        308,
        308
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
          308,
          308
        ],
        [
          308,
          443.76
        ]
      ],
      [
        [
          308,
          443.76
        ],
        [
          308,
          579.53
        ]
      ],
      [
        [
          443.76,
          579.53
        ],
        [
          308,
          443.76
        ]
      ],
      [
        [
          308,
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
          308
        ],
        [
          308,
          308
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true
  },
  {
    "chapter": 1,
    "name": "直角梯形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        308,
        212
      ],
      [
        692,
        212
      ],
      [
        692,
        788
      ],
      [
        308,
        404
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 276,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 628,
        "y": 404,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 372,
        "y": 340,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
        "y": 596,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 532,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660,
        "y": 692,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 452,
        "y": 452,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          692,
          212
        ],
        [
          500,
          404
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          308,
          212
        ]
      ],
      [
        [
          692,
          596
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          500,
          404
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          308,
          404
        ]
      ],
      [
        [
          692,
          596
        ],
        [
          596,
          692
        ]
      ],
      [
        [
          500,
          596
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          404,
          500
        ],
        [
          596,
          500
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 80,
    "parSteps": 22,
    "needFlip": true,
    "id": 8
  },
  {
    "chapter": 1,
    "name": "斜梯形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        212,
        212
      ],
      [
        596,
        212
      ],
      [
        788,
        404
      ],
      [
        788,
        788
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 404,
        "y": 276,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 596,
        "y": 340,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 724,
        "y": 468,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 692,
        "y": 596,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 596,
        "y": 532,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 756,
        "y": 692,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 548,
        "y": 452,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          596,
          212
        ],
        [
          404,
          404
        ]
      ],
      [
        [
          788,
          404
        ],
        [
          596,
          404
        ]
      ],
      [
        [
          596,
          404
        ],
        [
          404,
          404
        ]
      ],
      [
        [
          788,
          596
        ],
        [
          692,
          500
        ]
      ],
      [
        [
          692,
          500
        ],
        [
          596,
          404
        ]
      ],
      [
        [
          788,
          596
        ],
        [
          692,
          692
        ]
      ],
      [
        [
          596,
          596
        ],
        [
          692,
          500
        ]
      ],
      [
        [
          500,
          500
        ],
        [
          692,
          500
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 85,
    "parSteps": 23,
    "needFlip": true,
    "id": 9
  },
  {
    "chapter": 1,
    "name": "五边形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        356,
        260
      ],
      [
        740,
        260
      ],
      [
        740,
        644
      ],
      [
        644,
        740
      ],
      [
        260,
        356
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 324,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 676,
        "y": 452,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 420,
        "y": 388,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 644,
        "y": 644,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 548,
        "y": 580,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 324,
        "y": 356,
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
          740,
          260
        ],
        [
          548,
          452
        ]
      ],
      [
        [
          548,
          452
        ],
        [
          356,
          260
        ]
      ],
      [
        [
          740,
          644
        ],
        [
          644,
          548
        ]
      ],
      [
        [
          644,
          548
        ],
        [
          548,
          452
        ]
      ],
      [
        [
          548,
          452
        ],
        [
          356,
          452
        ]
      ],
      [
        [
          356,
          452
        ],
        [
          356,
          260
        ]
      ],
      [
        [
          548,
          644
        ],
        [
          644,
          548
        ]
      ],
      [
        [
          452,
          548
        ],
        [
          644,
          548
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true,
    "id": 10
  },
  {
    "chapter": 1,
    "name": "长六边形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        596,
        308
      ],
      [
        788,
        500
      ],
      [
        596,
        692
      ],
      [
        404,
        692
      ],
      [
        212,
        500
      ],
      [
        404,
        308
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 596,
        "y": 564,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 596,
        "y": 436,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 468,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404,
        "y": 596,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 276,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 500,
        "y": 660,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 356,
        "y": 452,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          788,
          500
        ],
        [
          404,
          500
        ]
      ],
      [
        [
          404,
          500
        ],
        [
          596,
          308
        ]
      ],
      [
        [
          596,
          692
        ],
        [
          500,
          596
        ]
      ],
      [
        [
          500,
          596
        ],
        [
          404,
          500
        ]
      ],
      [
        [
          404,
          500
        ],
        [
          404,
          308
        ]
      ],
      [
        [
          404,
          500
        ],
        [
          308,
          596
        ]
      ],
      [
        [
          308,
          596
        ],
        [
          308,
          404
        ]
      ],
      [
        [
          500,
          596
        ],
        [
          404,
          692
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 24,
    "needFlip": true,
    "id": 11
  },
  {
    "chapter": 1,
    "name": "长梯形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        260,
        356
      ],
      [
        452,
        164
      ],
      [
        740,
        452
      ],
      [
        740,
        836
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 516,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 676,
        "y": 644,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 420,
        "y": 388,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 452,
        "y": 260,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 324,
        "y": 356,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 548,
        "y": 324,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596,
        "y": 404,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          356,
          452
        ],
        [
          548,
          452
        ]
      ],
      [
        [
          548,
          452
        ],
        [
          740,
          452
        ]
      ],
      [
        [
          740,
          452
        ],
        [
          548,
          644
        ]
      ],
      [
        [
          356,
          260
        ],
        [
          452,
          356
        ]
      ],
      [
        [
          452,
          356
        ],
        [
          548,
          452
        ]
      ],
      [
        [
          356,
          452
        ],
        [
          356,
          260
        ]
      ],
      [
        [
          548,
          260
        ],
        [
          452,
          356
        ]
      ],
      [
        [
          644,
          356
        ],
        [
          452,
          356
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 105,
    "parSteps": 26,
    "needFlip": true,
    "id": 12
  },
  {
    "chapter": 1,
    "name": "切角六边形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        548,
        260
      ],
      [
        740,
        452
      ],
      [
        740,
        644
      ],
      [
        644,
        740
      ],
      [
        452,
        740
      ],
      [
        260,
        548
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 612,
        "y": 452,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 484,
        "y": 452,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 580,
        "y": 676,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 452,
        "y": 644,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 324,
        "y": 548,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388,
        "y": 548,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 692,
        "y": 596,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          548,
          644
        ],
        [
          548,
          260
        ]
      ],
      [
        [
          740,
          452
        ],
        [
          644,
          548
        ]
      ],
      [
        [
          644,
          548
        ],
        [
          548,
          644
        ]
      ],
      [
        [
          548,
          644
        ],
        [
          452,
          548
        ]
      ],
      [
        [
          452,
          548
        ],
        [
          356,
          452
        ]
      ],
      [
        [
          644,
          740
        ],
        [
          644,
          548
        ]
      ],
      [
        [
          452,
          740
        ],
        [
          548,
          644
        ]
      ],
      [
        [
          356,
          644
        ],
        [
          452,
          548
        ]
      ],
      [
        [
          356,
          644
        ],
        [
          356,
          452
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 105,
    "parSteps": 26,
    "needFlip": true,
    "id": 13
  },
  {
    "chapter": 1,
    "name": "斜方六边形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        260,
        452
      ],
      [
        260,
        260
      ],
      [
        452,
        260
      ],
      [
        740,
        548
      ],
      [
        740,
        740
      ],
      [
        548,
        740
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 452,
        "y": 516,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 452,
        "y": 388,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 324,
        "y": 324,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 644,
        "y": 548,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 708,
        "y": 644,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 548,
        "y": 612,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596,
        "y": 692,
        "angle": 0,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          260,
          452
        ],
        [
          644,
          452
        ]
      ],
      [
        [
          644,
          452
        ],
        [
          548,
          548
        ]
      ],
      [
        [
          548,
          548
        ],
        [
          452,
          644
        ]
      ],
      [
        [
          260,
          452
        ],
        [
          452,
          260
        ]
      ],
      [
        [
          740,
          548
        ],
        [
          644,
          644
        ]
      ],
      [
        [
          644,
          644
        ],
        [
          548,
          548
        ]
      ],
      [
        [
          740,
          740
        ],
        [
          644,
          644
        ]
      ],
      [
        [
          644,
          644
        ],
        [
          452,
          644
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 110,
    "parSteps": 27,
    "needFlip": true,
    "id": 14
  },
  {
    "chapter": 1,
    "name": "凹边菱形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        452,
        788
      ],
      [
        260,
        596
      ],
      [
        356,
        500
      ],
      [
        260,
        404
      ],
      [
        452,
        212
      ],
      [
        740,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 516,
        "y": 596,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 388,
        "y": 596,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 484,
        "y": 372,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 356,
        "y": 404,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 452,
        "y": 276,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 676,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596,
        "y": 452,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          452,
          788
        ],
        [
          452,
          404
        ]
      ],
      [
        [
          452,
          404
        ],
        [
          548,
          500
        ]
      ],
      [
        [
          548,
          500
        ],
        [
          644,
          596
        ]
      ],
      [
        [
          356,
          500
        ],
        [
          452,
          404
        ]
      ],
      [
        [
          644,
          404
        ],
        [
          644,
          596
        ]
      ],
      [
        [
          548,
          500
        ],
        [
          548,
          308
        ]
      ],
      [
        [
          452,
          404
        ],
        [
          356,
          308
        ]
      ],
      [
        [
          356,
          308
        ],
        [
          548,
          308
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 115,
    "parSteps": 27,
    "needFlip": false,
    "id": 15
  },
  {
    "chapter": 1,
    "name": "凹底方形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        692,
        548
      ],
      [
        500,
        740
      ],
      [
        308,
        740
      ],
      [
        308,
        356
      ],
      [
        404,
        260
      ],
      [
        500,
        356
      ],
      [
        596,
        260
      ],
      [
        692,
        356
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 500,
        "y": 484,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 500,
        "y": 612,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 372,
        "y": 676,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
        "y": 356,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 436,
        "y": 356,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 660,
        "y": 452,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 356,
        "y": 404,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          692,
          548
        ],
        [
          308,
          548
        ]
      ],
      [
        [
          308,
          548
        ],
        [
          404,
          452
        ]
      ],
      [
        [
          404,
          452
        ],
        [
          500,
          356
        ]
      ],
      [
        [
          500,
          356
        ],
        [
          596,
          452
        ]
      ],
      [
        [
          596,
          452
        ],
        [
          692,
          548
        ]
      ],
      [
        [
          500,
          740
        ],
        [
          308,
          548
        ]
      ],
      [
        [
          404,
          260
        ],
        [
          404,
          452
        ]
      ],
      [
        [
          692,
          356
        ],
        [
          596,
          452
        ]
      ]
    ],
    "hintTier": 2,
    "parTime": 110,
    "parSteps": 27,
    "needFlip": true,
    "id": 16
  },
  {
    "chapter": 1,
    "name": "盾形",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        212,
        308
      ],
      [
        788,
        308
      ],
      [
        692,
        404
      ],
      [
        692,
        596
      ],
      [
        596,
        692
      ],
      [
        404,
        692
      ],
      [
        308,
        596
      ],
      [
        308,
        404
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 532,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 404,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 660,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 404,
        "y": 596,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 660,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 340,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 644,
        "y": 548,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          596,
          308
        ],
        [
          404,
          500
        ]
      ],
      [
        [
          404,
          500
        ],
        [
          308,
          404
        ]
      ],
      [
        [
          596,
          308
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          596,
          692
        ]
      ],
      [
        [
          596,
          692
        ],
        [
          500,
          596
        ]
      ],
      [
        [
          500,
          596
        ],
        [
          404,
          500
        ]
      ],
      [
        [
          308,
          596
        ],
        [
          404,
          500
        ]
      ],
      [
        [
          500,
          596
        ],
        [
          404,
          692
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          692,
          404
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 130,
    "parSteps": 29,
    "needFlip": true,
    "id": 17
  },
  {
    "chapter": 1,
    "name": "纸飞机",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        500,
        596
      ],
      [
        404,
        692
      ],
      [
        212,
        500
      ],
      [
        500,
        212
      ],
      [
        692,
        404
      ],
      [
        596,
        500
      ],
      [
        788,
        500
      ],
      [
        500,
        788
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 404,
        "y": 436,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 404,
        "y": 564,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 660,
        "y": 564,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
        "y": 404,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 500,
        "y": 276,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 500,
        "y": 340,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 548,
        "y": 644,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          212,
          500
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          500,
          596
        ]
      ],
      [
        [
          404,
          308
        ],
        [
          500,
          404
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          596,
          692
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          596,
          308
        ]
      ],
      [
        [
          404,
          308
        ],
        [
          596,
          308
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 125,
    "parSteps": 28,
    "needFlip": true,
    "id": 18
  },
  {
    "chapter": 1,
    "name": "折纸箭",
    "tip": "几何 · 七块板拼出剪影",
    "outline": [
      [
        404,
        308
      ],
      [
        500,
        404
      ],
      [
        500,
        212
      ],
      [
        788,
        500
      ],
      [
        500,
        788
      ],
      [
        500,
        596
      ],
      [
        404,
        692
      ],
      [
        212,
        500
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 340,
        "y": 500,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 468,
        "y": 500,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 660,
        "y": 564,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
        "y": 404,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 692,
        "y": 468,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 532,
        "y": 308,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 548,
        "y": 644,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          404,
          692
        ],
        [
          404,
          308
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          500,
          596
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          596,
          692
        ]
      ],
      [
        [
          500,
          404
        ],
        [
          596,
          308
        ]
      ],
      [
        [
          692,
          404
        ],
        [
          596,
          500
        ]
      ],
      [
        [
          596,
          500
        ],
        [
          788,
          500
        ]
      ]
    ],
    "hintTier": 3,
    "parTime": 130,
    "parSteps": 29,
    "needFlip": true,
    "id": 19
  },
  {
    "id": 20,
    "chapter": 2,
    "name": "A",
    "tip": "字母·七巧 · 七块板拼出大写 A",
    "outline": [
      [
        702.137,
        364.471
      ],
      [
        701.935,
        747.219
      ],
      [
        566.171,
        747.219
      ],
      [
        565.761,
        611.864
      ],
      [
        510.067,
        556.171
      ],
      [
        294.945,
        771.294
      ],
      [
        294.945,
        499.765
      ],
      [
        297.528,
        500.002
      ],
      [
        297.525,
        363.525
      ],
      [
        433.29,
        227.761
      ],
      [
        569.05,
        228.942
      ]
    ],
    "holes": [
      [
        [
          433.292,
          499.765
        ],
        [
          566.941,
          499.765
        ],
        [
          566.941,
          364.706
        ],
        [
          433.292,
          364.706
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 638.137,
        "y": 556.24,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.454,
        "y": 590.274,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.05,
        "y": 319.451,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 365.41,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 611.426,
        "y": 701.964,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 612.196,
        "y": 409.726,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 433.29,
        "y": 295.643,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          510.14,
          556.24
        ],
        [
          566.54,
          499.83
        ]
      ],
      [
        [
          701.53,
          747.63
        ],
        [
          565.76,
          611.86
        ]
      ],
      [
        [
          566.54,
          499.84
        ],
        [
          702.14,
          364.24
        ]
      ],
      [
        [
          297.53,
          499.76
        ],
        [
          433.29,
          499.76
        ]
      ],
      [
        [
          702.71,
          364.71
        ],
        [
          566.94,
          364.71
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 21,
    "chapter": 2,
    "name": "B",
    "tip": "字母·七巧 · 七块板拼出大写 B",
    "outline": [
      [
        299.063,
        499.995
      ],
      [
        296.115,
        502.944
      ],
      [
        296.115,
        231.415
      ],
      [
        568.121,
        231.415
      ],
      [
        568.121,
        228.235
      ],
      [
        703.885,
        363.999
      ],
      [
        701.602,
        364.238
      ],
      [
        565.837,
        500.333
      ],
      [
        683.197,
        500.333
      ],
      [
        683.197,
        692.333
      ],
      [
        663.42,
        671.88
      ],
      [
        567.184,
        768.116
      ],
      [
        570.834,
        771.765
      ],
      [
        299.305,
        771.765
      ]
    ],
    "holes": [
      [
        [
          567.644,
          231.415
        ],
        [
          299.54,
          499.667
        ],
        [
          430.073,
          500.002
        ],
        [
          565.837,
          364.238
        ],
        [
          568.121,
          363.999
        ]
      ],
      [
        [
          395.137,
          596.069
        ],
        [
          471.42,
          671.88
        ],
        [
          567.082,
          576.218
        ],
        [
          491.035,
          500.172
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.624,
        "y": 321.924,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 389.814,
        "y": 681.256,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 619.197,
        "y": 564.333,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "S",
        "x": 567.42,
        "y": 671.88,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.376,
        "y": 318.744,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 395.54,
        "y": 531.667,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 565.837,
        "y": 432.12,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          471.18,
          672.12
        ],
        [
          567.18,
          768.12
        ]
      ],
      [
        [
          299.3,
          500.24
        ],
        [
          395.14,
          596.07
        ]
      ],
      [
        [
          663.08,
          672.22
        ],
        [
          567.08,
          576.22
        ]
      ],
      [
        [
          491.2,
          500.33
        ],
        [
          565.84,
          500.33
        ]
      ],
      [
        [
          701.6,
          364
        ],
        [
          568.12,
          364
        ]
      ],
      [
        [
          430.07,
          499.67
        ],
        [
          491.54,
          499.67
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 22,
    "chapter": 2,
    "name": "C",
    "tip": "字母·七巧 · 七块板拼出大写 C",
    "outline": [
      [
        480.237,
        584.949
      ],
      [
        559.237,
        662.767
      ],
      [
        694.649,
        527.355
      ],
      [
        695.24,
        663.71
      ],
      [
        559.827,
        799.122
      ],
      [
        423.36,
        798.648
      ],
      [
        287.355,
        662.884
      ],
      [
        288.307,
        392.88
      ],
      [
        480.307,
        200.88
      ],
      [
        480.648,
        204.338
      ],
      [
        616.412,
        204.338
      ],
      [
        616.077,
        207.89
      ],
      [
        712.077,
        303.89
      ],
      [
        616.077,
        399.89
      ],
      [
        616.412,
        340.102
      ],
      [
        480.307,
        340.102
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 377.864,
        "y": 573.086,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 416.307,
        "y": 392.88,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 423.36,
        "y": 708.139,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 548.53,
        "y": 272.22,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 648.077,
        "y": 303.89,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 649.394,
        "y": 617.864,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 559.827,
        "y": 731.24,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          288.24,
          392.95
        ],
        [
          480.24,
          584.95
        ]
      ],
      [
        [
          480.31,
          204.34
        ],
        [
          480.31,
          340.1
        ]
      ],
      [
        [
          616.41,
          207.89
        ],
        [
          616.41,
          340.1
        ]
      ],
      [
        [
          694.65,
          663.12
        ],
        [
          559.83,
          663.12
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 23,
    "chapter": 2,
    "name": "D",
    "tip": "字母·七巧 · 七块板拼出大写 D",
    "outline": [
      [
        293.515,
        496.256
      ],
      [
        296.255,
        498.534
      ],
      [
        296.255,
        227.005
      ],
      [
        567.784,
        227.005
      ],
      [
        564.964,
        229.819
      ],
      [
        700.615,
        365.47
      ],
      [
        701.322,
        501.235
      ],
      [
        701.322,
        636.524
      ],
      [
        706.255,
        636.524
      ],
      [
        570.49,
        772.288
      ],
      [
        565.044,
        767.785
      ],
      [
        293.515,
        767.785
      ]
    ],
    "holes": [
      [
        [
          296.023,
          498.765
        ],
        [
          434.725,
          636.524
        ],
        [
          565.558,
          636.992
        ],
        [
          565.791,
          500.999
        ],
        [
          564.851,
          365.229
        ],
        [
          429.557,
          365.231
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 384.024,
        "y": 677.276,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.764,
        "y": 317.514,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 570.49,
        "y": 681.779,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 633.44,
        "y": 569.11,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 520.064,
        "y": 319.974,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 611.046,
        "y": 455.744,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 632.733,
        "y": 365.47,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          565.32,
          229.47
        ],
        [
          429.56,
          365.23
        ]
      ],
      [
        [
          565.56,
          636.52
        ],
        [
          701.32,
          636.52
        ]
      ],
      [
        [
          565.79,
          501.23
        ],
        [
          701.32,
          501.23
        ]
      ],
      [
        [
          565.32,
          229.71
        ],
        [
          565.32,
          365.23
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 24,
    "chapter": 2,
    "name": "E",
    "tip": "字母·七巧 · 七块板拼出大写 E",
    "outline": [
      [
        297.423,
        227.981
      ],
      [
        704.716,
        227.981
      ],
      [
        568.952,
        363.746
      ],
      [
        433.187,
        363.746
      ],
      [
        433.187,
        431.088
      ],
      [
        568.952,
        431.088
      ],
      [
        568.952,
        566.852
      ],
      [
        433.187,
        566.852
      ],
      [
        433.187,
        635.275
      ],
      [
        568.952,
        635.275
      ],
      [
        704.716,
        771.039
      ],
      [
        297.423,
        771.039
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 387.932,
        "y": 318.491,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 387.932,
        "y": 680.529,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 387.932,
        "y": 499.51,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 501.07,
        "y": 498.97,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 614.207,
        "y": 273.236,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 523.697,
        "y": 318.491,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.952,
        "y": 703.157,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          433.19,
          363.75
        ],
        [
          297.42,
          499.51
        ]
      ],
      [
        [
          568.95,
          227.98
        ],
        [
          433.19,
          363.75
        ]
      ],
      [
        [
          297.42,
          499.51
        ],
        [
          433.19,
          635.27
        ]
      ],
      [
        [
          433.19,
          635.27
        ],
        [
          568.95,
          771.04
        ]
      ],
      [
        [
          433.19,
          431.09
        ],
        [
          433.19,
          566.85
        ]
      ],
      [
        [
          568.95,
          363.75
        ],
        [
          568.95,
          227.98
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 25,
    "chapter": 2,
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出大写 F",
    "outline": [
      [
        295.355,
        473.174
      ],
      [
        295.355,
        201.645
      ],
      [
        566.765,
        201.526
      ],
      [
        568.64,
        199.651
      ],
      [
        704.405,
        199.651
      ],
      [
        700.279,
        204.015
      ],
      [
        700.279,
        339.779
      ],
      [
        564.515,
        339.779
      ],
      [
        568.64,
        335.415
      ],
      [
        432.649,
        335.885
      ],
      [
        432.649,
        472.213
      ],
      [
        681.12,
        472.213
      ],
      [
        489.12,
        663.547
      ],
      [
        433.262,
        663.878
      ],
      [
        433.262,
        799.642
      ],
      [
        297.498,
        799.642
      ],
      [
        297.453,
        663.547
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 385.864,
        "y": 292.154,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 489.12,
        "y": 536.213,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 361.453,
        "y": 599.547,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 365.38,
        "y": 731.76,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 655.024,
        "y": 294.524,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 387.394,
        "y": 426.394,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.64,
        "y": 267.533,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          432.65,
          335.88
        ],
        [
          296.88,
          471.65
        ]
      ],
      [
        [
          566.88,
          201.64
        ],
        [
          432.99,
          335.53
        ]
      ],
      [
        [
          297.12,
          472.21
        ],
        [
          432.65,
          472.21
        ]
      ],
      [
        [
          433.26,
          663.55
        ],
        [
          297.5,
          663.55
        ]
      ],
      [
        [
          568.76,
          335.53
        ],
        [
          700.28,
          204.01
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 26,
    "chapter": 2,
    "name": "G",
    "tip": "字母·七巧 · 七块板拼出大写 G",
    "outline": [
      [
        490.037,
        201.36
      ],
      [
        490.611,
        205.791
      ],
      [
        626.375,
        205.791
      ],
      [
        490.037,
        341.555
      ],
      [
        489.967,
        585.429
      ],
      [
        567.761,
        662.28
      ],
      [
        603.18,
        627.58
      ],
      [
        507.18,
        531.58
      ],
      [
        603.18,
        435.58
      ],
      [
        698.82,
        531.22
      ],
      [
        702.935,
        527.105
      ],
      [
        702.935,
        662.87
      ],
      [
        567.171,
        798.399
      ],
      [
        432.118,
        798.166
      ],
      [
        296.115,
        662.404
      ],
      [
        296.115,
        391.576
      ],
      [
        298.037,
        393.36
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 426.037,
        "y": 393.36,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.624,
        "y": 572.596,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.12,
        "y": 707.659,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 603.18,
        "y": 531.58,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 535.866,
        "y": 251.046,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.394,
        "y": 753.144,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.053,
        "y": 662.87,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          490.04,
          585.36
        ],
        [
          298.04,
          393.36
        ]
      ],
      [
        [
          490.04,
          205.79
        ],
        [
          490.04,
          341.56
        ]
      ],
      [
        [
          567.65,
          662.64
        ],
        [
          432.12,
          798.17
        ]
      ],
      [
        [
          699.18,
          531.58
        ],
        [
          603.18,
          627.58
        ]
      ],
      [
        [
          567.65,
          662.87
        ],
        [
          567.65,
          798.4
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false,
    "gapFill": [
      {
        "a": "S",
        "pts": [
          [
            490.037,
            522.58
          ],
          [
            504.972,
            529.372
          ],
          [
            507.18,
            531.58
          ],
          [
            490.037,
            540.58
          ]
        ]
      },
      {
        "a": "S",
        "pts": [
          [
            471.649,
            567.111
          ],
          [
            507.18,
            531.58
          ],
          [
            526.979,
            551.379
          ],
          [
            491.448,
            586.91
          ]
        ]
      },
      {
        "a": "S",
        "pts": [
          [
            491.448,
            586.91
          ],
          [
            526.979,
            551.379
          ],
          [
            546.778,
            571.178
          ],
          [
            511.247,
            606.709
          ]
        ]
      },
      {
        "a": "S",
        "pts": [
          [
            511.247,
            606.709
          ],
          [
            546.778,
            571.178
          ],
          [
            566.577,
            590.977
          ],
          [
            531.046,
            626.508
          ]
        ]
      },
      {
        "a": "S",
        "pts": [
          [
            531.046,
            626.508
          ],
          [
            566.577,
            590.977
          ],
          [
            586.376,
            610.776
          ],
          [
            550.845,
            646.307
          ]
        ]
      },
      {
        "a": "S",
        "pts": [
          [
            550.845,
            646.307
          ],
          [
            586.376,
            610.776
          ],
          [
            603.175,
            627.575
          ],
          [
            567.643,
            663.106
          ]
        ]
      }
    ]
  },
  {
    "id": 27,
    "chapter": 2,
    "name": "H",
    "tip": "字母·七巧 · 七块板拼出大写 H",
    "outline": [
      [
        283.265,
        248.416
      ],
      [
        555.028,
        519.945
      ],
      [
        555.616,
        487.264
      ],
      [
        444.739,
        376.855
      ],
      [
        444.739,
        382.225
      ],
      [
        308.975,
        246.461
      ],
      [
        444.739,
        246.461
      ],
      [
        445.206,
        376.855
      ],
      [
        572.708,
        377.092
      ],
      [
        572.708,
        241.328
      ],
      [
        708.472,
        241.328
      ],
      [
        708.472,
        376.855
      ],
      [
        716.735,
        376.855
      ],
      [
        716.735,
        648.384
      ],
      [
        690.792,
        623.617
      ],
      [
        690.792,
        759.382
      ],
      [
        555.028,
        623.617
      ],
      [
        554.794,
        519.945
      ],
      [
        494.413,
        520.043
      ],
      [
        441.839,
        571.475
      ],
      [
        441.839,
        707.239
      ],
      [
        306.646,
        707.811
      ],
      [
        302.413,
        712.043
      ],
      [
        302.413,
        519.945
      ],
      [
        283.265,
        519.945
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 373.774,
        "y": 429.436,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 626.226,
        "y": 467.364,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 366.413,
        "y": 584.043,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 640.59,
        "y": 309.21,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 396.584,
        "y": 661.984,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 399.484,
        "y": 291.716,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 622.91,
        "y": 623.617,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          494.41,
          519.95
        ],
        [
          302.41,
          519.95
        ]
      ],
      [
        [
          572.71,
          376.85
        ],
        [
          708.47,
          376.85
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true,
    "gapFill": [
      {
        "a": "T1",
        "pts": [
          [
            428.454,
            393.607
          ],
          [
            445.207,
            376.854
          ],
          [
            465.006,
            396.653
          ],
          [
            448.253,
            413.406
          ]
        ]
      },
      {
        "a": "T1",
        "pts": [
          [
            448.253,
            413.406
          ],
          [
            465.006,
            396.653
          ],
          [
            484.805,
            416.452
          ],
          [
            468.052,
            433.205
          ]
        ]
      },
      {
        "a": "T1",
        "pts": [
          [
            468.052,
            433.205
          ],
          [
            484.805,
            416.452
          ],
          [
            504.604,
            436.251
          ],
          [
            487.851,
            453.004
          ]
        ]
      },
      {
        "a": "T2",
        "pts": [
          [
            487.851,
            453.004
          ],
          [
            504.604,
            436.251
          ],
          [
            524.403,
            456.05
          ],
          [
            507.65,
            472.803
          ]
        ]
      },
      {
        "a": "T2",
        "pts": [
          [
            507.65,
            472.803
          ],
          [
            524.403,
            456.05
          ],
          [
            544.202,
            475.849
          ],
          [
            527.449,
            492.602
          ]
        ]
      },
      {
        "a": "T2",
        "pts": [
          [
            527.449,
            492.602
          ],
          [
            544.202,
            475.849
          ],
          [
            564.001,
            495.648
          ],
          [
            547.248,
            512.401
          ]
        ]
      },
      {
        "a": "T2",
        "pts": [
          [
            547.248,
            512.401
          ],
          [
            564.001,
            495.648
          ],
          [
            571.546,
            503.193
          ],
          [
            554.793,
            519.946
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            295.142,
            260.294
          ],
          [
            308.974,
            246.461
          ],
          [
            328.773,
            266.26
          ],
          [
            314.941,
            280.093
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            314.941,
            280.093
          ],
          [
            328.773,
            266.26
          ],
          [
            348.572,
            286.059
          ],
          [
            334.74,
            299.892
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            334.74,
            299.892
          ],
          [
            348.572,
            286.059
          ],
          [
            368.371,
            305.858
          ],
          [
            354.539,
            319.691
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            354.539,
            319.691
          ],
          [
            368.371,
            305.858
          ],
          [
            388.17,
            325.657
          ],
          [
            374.338,
            339.49
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            374.338,
            339.49
          ],
          [
            388.17,
            325.657
          ],
          [
            407.969,
            345.456
          ],
          [
            394.137,
            359.289
          ]
        ]
      },
      {
        "a": "T5",
        "pts": [
          [
            394.137,
            359.289
          ],
          [
            407.969,
            345.456
          ],
          [
            427.768,
            365.255
          ],
          [
            413.936,
            379.088
          ]
        ]
      },
      {
        "a": "T1",
        "pts": [
          [
            413.936,
            379.088
          ],
          [
            427.768,
            365.255
          ],
          [
            444.739,
            382.226
          ],
          [
            430.906,
            396.058
          ]
        ]
      }
    ]
  },
  {
    "id": 28,
    "chapter": 2,
    "name": "I",
    "tip": "字母·七巧 · 七块板拼出大写 I",
    "outline": [
      [
        332.32,
        182.373
      ],
      [
        716.32,
        182.373
      ],
      [
        620.653,
        278.04
      ],
      [
        620.653,
        470.04
      ],
      [
        611.453,
        460.84
      ],
      [
        599.486,
        472.945
      ],
      [
        599.018,
        657.508
      ],
      [
        734.782,
        657.508
      ],
      [
        734.782,
        793.272
      ],
      [
        599.018,
        793.272
      ],
      [
        599.486,
        744.475
      ],
      [
        536.509,
        682.198
      ],
      [
        536.509,
        817.729
      ],
      [
        400.273,
        817.962
      ],
      [
        264.508,
        817.962
      ],
      [
        400.273,
        682.198
      ],
      [
        536.623,
        681.612
      ],
      [
        463.653,
        608.641
      ],
      [
        419.453,
        652.84
      ],
      [
        419.12,
        269.173
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 524.32,
        "y": 246.373,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 483.453,
        "y": 460.84,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 554.231,
        "y": 608.71,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 666.9,
        "y": 725.39,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 588.653,
        "y": 374.04,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 491.254,
        "y": 772.474,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 400.273,
        "y": 750.08,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          524.32,
          374.37
        ],
        [
          419.12,
          269.17
        ]
      ],
      [
        [
          620.65,
          278.04
        ],
        [
          524.65,
          374.04
        ]
      ],
      [
        [
          599.42,
          472.88
        ],
        [
          463.65,
          608.64
        ]
      ],
      [
        [
          524.65,
          374.04
        ],
        [
          611.45,
          460.84
        ]
      ],
      [
        [
          599.49,
          657.51
        ],
        [
          599.49,
          744.47
        ]
      ],
      [
        [
          400.74,
          817.73
        ],
        [
          536.16,
          682.32
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 29,
    "chapter": 2,
    "name": "J",
    "tip": "字母·七巧 · 七块板拼出大写 J",
    "outline": [
      [
        356,
        164.333
      ],
      [
        740,
        164.333
      ],
      [
        644.333,
        260
      ],
      [
        643.667,
        452
      ],
      [
        644.5,
        644.5
      ],
      [
        547.833,
        739.833
      ],
      [
        452,
        835.667
      ],
      [
        355.833,
        739.833
      ],
      [
        260,
        644
      ],
      [
        356,
        548
      ],
      [
        452.333,
        643.667
      ],
      [
        452,
        260.333
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 228.333,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 516.333,
        "y": 452,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 579.667,
        "y": 579.667,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 356,
        "y": 644,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 452,
        "y": 771.667,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 612.333,
        "y": 356,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500.5,
        "y": 692.5,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          548,
          356.33
        ],
        [
          452,
          260.33
        ]
      ],
      [
        [
          644.33,
          260
        ],
        [
          548.33,
          356
        ]
      ],
      [
        [
          548.33,
          356
        ],
        [
          644.33,
          452
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 30,
    "chapter": 2,
    "name": "K",
    "tip": "字母·七巧 · 七块板拼出大写 K",
    "outline": [
      [
        280.553,
        813.85
      ],
      [
        280.22,
        430.183
      ],
      [
        268.523,
        417.91
      ],
      [
        268.523,
        226.333
      ],
      [
        459.947,
        226.333
      ],
      [
        460.28,
        282.15
      ],
      [
        556.28,
        186.15
      ],
      [
        652.28,
        282.15
      ],
      [
        555.947,
        378.15
      ],
      [
        460.521,
        473.915
      ],
      [
        595.7,
        610.265
      ],
      [
        731.107,
        745.672
      ],
      [
        595.343,
        745.672
      ],
      [
        472.553,
        621.85
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 344.553,
        "y": 621.85,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 395.947,
        "y": 417.91,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 332.523,
        "y": 290.333,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 556.28,
        "y": 282.15,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 505.776,
        "y": 564.424,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 491.947,
        "y": 378.15,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 595.343,
        "y": 677.79,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          280.55,
          429.85
        ],
        [
          460.28,
          609.58
        ]
      ],
      [
        [
          459.95,
          473.91
        ],
        [
          459.95,
          609.68
        ]
      ],
      [
        [
          459.95,
          282.15
        ],
        [
          459.95,
          474.15
        ]
      ],
      [
        [
          556.11,
          377.98
        ],
        [
          460.28,
          282.15
        ]
      ],
      [
        [
          595.34,
          609.68
        ],
        [
          460.52,
          609.68
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false,
    "gapFill": [
      {
        "a": "T3",
        "pts": [
          [
            268.523,
            418.333
          ],
          [
            275.143,
            411.713
          ],
          [
            280.553,
            429.85
          ],
          [
            280.553,
            438.85
          ]
        ]
      }
    ]
  },
  {
    "id": 31,
    "chapter": 2,
    "name": "L",
    "tip": "字母·七巧 · 七块板拼出大写 L",
    "outline": [
      [
        267.013,
        787.31
      ],
      [
        267.013,
        211.643
      ],
      [
        458.347,
        211.643
      ],
      [
        458.842,
        595.138
      ],
      [
        464.51,
        589.47
      ],
      [
        560.16,
        685.12
      ],
      [
        596.853,
        648.428
      ],
      [
        732.617,
        648.428
      ],
      [
        728.579,
        652.695
      ],
      [
        728.579,
        788.459
      ],
      [
        592.815,
        788.459
      ],
      [
        596.853,
        784.192
      ],
      [
        461.088,
        784.192
      ],
      [
        464.51,
        781.803
      ],
      [
        272.515,
        781.808
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 331.013,
        "y": 595.31,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 394.347,
        "y": 403.31,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 331.013,
        "y": 275.643,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 464.51,
        "y": 685.47,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 683.324,
        "y": 743.204,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 368.51,
        "y": 749.803,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596.853,
        "y": 716.31,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          267.01,
          403.31
        ],
        [
          458.68,
          594.98
        ]
      ],
      [
        [
          459.01,
          595.31
        ],
        [
          368.68,
          685.64
        ]
      ],
      [
        [
          368.52,
          685.81
        ],
        [
          272.52,
          781.81
        ]
      ],
      [
        [
          464.51,
          781.47
        ],
        [
          368.68,
          685.64
        ]
      ],
      [
        [
          560.51,
          685.47
        ],
        [
          464.51,
          781.47
        ]
      ],
      [
        [
          596.97,
          784.31
        ],
        [
          728.58,
          652.69
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 32,
    "chapter": 2,
    "name": "M",
    "tip": "字母·七巧 · 七块板拼出大写 M",
    "outline": [
      [
        308.333,
        603.71
      ],
      [
        308.333,
        219.71
      ],
      [
        498.927,
        410.97
      ],
      [
        690.927,
        218.97
      ],
      [
        691.443,
        602.454
      ],
      [
        731.762,
        642.773
      ],
      [
        730.445,
        777.459
      ],
      [
        594.681,
        777.459
      ],
      [
        595.998,
        642.773
      ],
      [
        596,
        507.71
      ],
      [
        500,
        603.71
      ],
      [
        404.476,
        507.715
      ],
      [
        406.025,
        780.799
      ],
      [
        270.261,
        780.799
      ],
      [
        268.712,
        643.48
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 372.333,
        "y": 411.71,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 626.927,
        "y": 410.97,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 359.221,
        "y": 643.48,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500,
        "y": 507.71,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 315.516,
        "y": 735.544,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 639.936,
        "y": 732.204,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 663.88,
        "y": 642.773,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          404.4,
          507.64
        ],
        [
          308.33,
          603.71
        ]
      ],
      [
        [
          500.17,
          411.88
        ],
        [
          404.17,
          507.88
        ]
      ],
      [
        [
          595.83,
          507.88
        ],
        [
          499.83,
          411.88
        ]
      ],
      [
        [
          404.48,
          779.24
        ],
        [
          270.26,
          645.03
        ]
      ],
      [
        [
          595.88,
          642.89
        ],
        [
          730.45,
          777.46
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 33,
    "chapter": 2,
    "name": "N",
    "tip": "字母·七巧 · 七块板拼出大写 N",
    "outline": [
      [
        265.123,
        587.78
      ],
      [
        265.123,
        203.78
      ],
      [
        457.123,
        395.78
      ],
      [
        328.121,
        524.921
      ],
      [
        464.357,
        524.688
      ],
      [
        598.934,
        524.688
      ],
      [
        599.205,
        253.431
      ],
      [
        734.969,
        253.431
      ],
      [
        734.837,
        389.195
      ],
      [
        734.837,
        772.93
      ],
      [
        543.358,
        581.451
      ],
      [
        464.357,
        660.452
      ],
      [
        454.452,
        660.458
      ],
      [
        454.452,
        796.222
      ],
      [
        318.688,
        796.222
      ],
      [
        318.688,
        660.458
      ],
      [
        328.121,
        660.452
      ],
      [
        328.052,
        524.852
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 329.123,
        "y": 395.78,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 670.837,
        "y": 580.93,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 644.189,
        "y": 388.93,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 386.57,
        "y": 728.34,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 689.714,
        "y": 298.686,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 373.376,
        "y": 570.176,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 464.357,
        "y": 592.57,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          599,
          524.76
        ],
        [
          734.77,
          389
        ]
      ],
      [
        [
          599.2,
          253.43
        ],
        [
          734.7,
          388.93
        ]
      ],
      [
        [
          328.59,
          660.46
        ],
        [
          454.45,
          660.46
        ]
      ],
      [
        [
          463.89,
          524.92
        ],
        [
          328.47,
          660.33
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 34,
    "chapter": 2,
    "name": "O",
    "tip": "字母·七巧 · 七块板拼出大写 O",
    "outline": [
      [
        685.125,
        492.654
      ],
      [
        681.667,
        490
      ],
      [
        681.833,
        681.833
      ],
      [
        586.404,
        778.875
      ],
      [
        314.875,
        778.875
      ],
      [
        314.875,
        507.346
      ],
      [
        319.11,
        511.11
      ],
      [
        319.29,
        319.29
      ],
      [
        415.526,
        223.054
      ],
      [
        413.596,
        221.125
      ],
      [
        685.125,
        221.125
      ]
    ],
    "holes": [
      [
        [
          586.069,
          393.597
        ],
        [
          511.29,
          319.29
        ],
        [
          415.11,
          415.29
        ],
        [
          414.874,
          607.346
        ],
        [
          489.833,
          681.5
        ],
        [
          585.667,
          586
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 594.616,
        "y": 311.634,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 405.384,
        "y": 688.366,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 617.667,
        "y": 617.667,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 415.29,
        "y": 319.29,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 617.667,
        "y": 490,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 586,
        "y": 713.667,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 367.11,
        "y": 463.11,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          511.53,
          319.05
        ],
        [
          415.53,
          223.05
        ]
      ],
      [
        [
          682.07,
          489.6
        ],
        [
          586.07,
          393.6
        ]
      ],
      [
        [
          489.6,
          682.07
        ],
        [
          585.6,
          778.07
        ]
      ],
      [
        [
          318.87,
          511.35
        ],
        [
          414.87,
          607.35
        ]
      ],
      [
        [
          585.5,
          585.83
        ],
        [
          681.5,
          489.83
        ]
      ],
      [
        [
          681.67,
          681.67
        ],
        [
          490,
          681.67
        ]
      ],
      [
        [
          415.11,
          415.11
        ],
        [
          319.29,
          319.29
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 35,
    "chapter": 2,
    "name": "P",
    "tip": "字母·七巧 · 七块板拼出大写 P",
    "outline": [
      [
        297.495,
        771.289
      ],
      [
        297.494,
        499.764
      ],
      [
        294.735,
        502.524
      ],
      [
        294.735,
        230.995
      ],
      [
        566.735,
        231.466
      ],
      [
        569.26,
        228.942
      ],
      [
        705.022,
        364.706
      ],
      [
        704.317,
        499.998
      ],
      [
        568.553,
        635.762
      ],
      [
        433.259,
        635.762
      ],
      [
        433.259,
        771.289
      ]
    ],
    "holes": [
      [
        [
          433.259,
          499.765
        ],
        [
          569.258,
          499.765
        ],
        [
          569.258,
          364.706
        ],
        [
          433.259,
          364.706
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388.004,
        "y": 590.274,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.244,
        "y": 321.504,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.26,
        "y": 319.451,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 637.14,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 388.004,
        "y": 726.034,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388.004,
        "y": 454.504,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.553,
        "y": 567.88,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          433.26,
          635.53
        ],
        [
          297.5,
          771.29
        ]
      ],
      [
        [
          297.49,
          499.76
        ],
        [
          433.26,
          499.76
        ]
      ],
      [
        [
          568.67,
          500.12
        ],
        [
          432.91,
          635.88
        ]
      ],
      [
        [
          433.26,
          364
        ],
        [
          297.5,
          499.76
        ]
      ],
      [
        [
          705.02,
          364.71
        ],
        [
          569.26,
          364.71
        ]
      ],
      [
        [
          704.32,
          500
        ],
        [
          569.26,
          500
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 36,
    "chapter": 2,
    "name": "Q",
    "tip": "字母·七巧 · 七块板拼出大写 Q",
    "outline": [
      [
        451.667,
        788
      ],
      [
        260.333,
        596
      ],
      [
        260.333,
        404.333
      ],
      [
        264.59,
        403.667
      ],
      [
        456.59,
        211.667
      ],
      [
        648.59,
        403.667
      ],
      [
        643.5,
        403.667
      ],
      [
        644,
        596
      ],
      [
        740,
        692
      ],
      [
        644,
        788
      ],
      [
        547.667,
        692
      ]
    ],
    "holes": [
      [
        [
          451.667,
          404.333
        ],
        [
          451.667,
          596
        ],
        [
          547.5,
          691.5
        ],
        [
          547.667,
          499.333
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 387.667,
        "y": 596,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 456.59,
        "y": 339.667,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 324.333,
        "y": 468.333,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 644,
        "y": 692,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 483.667,
        "y": 692,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 548,
        "y": 435.667,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 595.5,
        "y": 547.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          451.67,
          596
        ],
        [
          451.67,
          788
        ]
      ],
      [
        [
          644,
          403.67
        ],
        [
          452,
          403.67
        ]
      ],
      [
        [
          643.83,
          403.83
        ],
        [
          548,
          499.67
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 37,
    "chapter": 2,
    "name": "R",
    "tip": "字母·七巧 · 七块板拼出大写 R",
    "outline": [
      [
        297.625,
        499.764
      ],
      [
        297.625,
        228.235
      ],
      [
        569.39,
        228.942
      ],
      [
        705.155,
        364.706
      ],
      [
        699.042,
        364.238
      ],
      [
        699.042,
        500.002
      ],
      [
        566.489,
        499.409
      ],
      [
        702.142,
        635.063
      ],
      [
        702.142,
        770.827
      ],
      [
        566.378,
        635.063
      ],
      [
        566.134,
        499.765
      ],
      [
        433.989,
        631.915
      ],
      [
        433.989,
        767.679
      ],
      [
        298.222,
        767.676
      ],
      [
        294.605,
        771.294
      ],
      [
        294.605,
        499.765
      ]
    ],
    "holes": [
      [
        [
          433.389,
          499.765
        ],
        [
          563.278,
          500.002
        ],
        [
          563.278,
          364.706
        ],
        [
          433.389,
          364.706
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388.134,
        "y": 318.744,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.114,
        "y": 590.274,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.39,
        "y": 319.451,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 631.16,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 388.734,
        "y": 722.424,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388.134,
        "y": 454.514,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 634.26,
        "y": 635.063,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          433.39,
          364
        ],
        [
          297.62,
          499.76
        ]
      ],
      [
        [
          433.99,
          631.91
        ],
        [
          298.22,
          767.68
        ]
      ],
      [
        [
          297.62,
          499.76
        ],
        [
          433.39,
          499.76
        ]
      ],
      [
        [
          699.04,
          364.71
        ],
        [
          563.28,
          364.71
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 38,
    "chapter": 2,
    "name": "S",
    "tip": "字母·七巧 · 七块板拼出大写 S",
    "outline": [
      [
        431.787,
        185.05
      ],
      [
        432.351,
        192.181
      ],
      [
        567.882,
        192.414
      ],
      [
        703.645,
        328.176
      ],
      [
        431.787,
        328.176
      ],
      [
        432.118,
        432.498
      ],
      [
        568.213,
        430.95
      ],
      [
        760.213,
        622.95
      ],
      [
        568.213,
        814.95
      ],
      [
        567.649,
        808.022
      ],
      [
        432.827,
        808.022
      ],
      [
        297.063,
        672.258
      ],
      [
        432.827,
        672.491
      ],
      [
        568.213,
        672.491
      ],
      [
        567.882,
        568.262
      ],
      [
        431.558,
        568.822
      ],
      [
        239.787,
        377.05
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 367.787,
        "y": 377.05,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 632.213,
        "y": 622.95,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.88,
        "y": 282.921,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500,
        "y": 500.38,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 477.606,
        "y": 237.436,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.394,
        "y": 717.746,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 432.827,
        "y": 740.14,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          431.79,
          432.5
        ],
        [
          431.79,
          568.26
        ]
      ],
      [
        [
          431.79,
          192.18
        ],
        [
          431.79,
          327.95
        ]
      ],
      [
        [
          568.21,
          568.26
        ],
        [
          568.21,
          432.5
        ]
      ],
      [
        [
          568.21,
          808.26
        ],
        [
          568.21,
          672.49
        ]
      ],
      [
        [
          432.35,
          327.94
        ],
        [
          567.88,
          192.41
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 39,
    "chapter": 2,
    "name": "T",
    "tip": "字母·七巧 · 七块板拼出大写 T",
    "outline": [
      [
        416.273,
        799.79
      ],
      [
        416.338,
        415.726
      ],
      [
        337.475,
        336.859
      ],
      [
        201.711,
        336.859
      ],
      [
        201.711,
        199.975
      ],
      [
        472.115,
        200.208
      ],
      [
        607.642,
        200.208
      ],
      [
        607.983,
        214.263
      ],
      [
        799.983,
        214.263
      ],
      [
        607.409,
        406.263
      ],
      [
        607.642,
        471.975
      ],
      [
        608.273,
        607.79
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 480.273,
        "y": 607.79,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 381.606,
        "y": 290.484,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 671.983,
        "y": 278.263,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 539.76,
        "y": 268.09,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 246.966,
        "y": 291.604,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 562.154,
        "y": 381.466,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 539.76,
        "y": 471.033,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          416.27,
          415.79
        ],
        [
          472.05,
          471.57
        ]
      ],
      [
        [
          471.7,
          471.21
        ],
        [
          607.46,
          606.98
        ]
      ],
      [
        [
          472.12,
          200.21
        ],
        [
          472.12,
          335.97
        ]
      ],
      [
        [
          337.47,
          336.86
        ],
        [
          201.71,
          201.1
        ]
      ],
      [
        [
          472.12,
          335.27
        ],
        [
          472.12,
          471.03
        ]
      ],
      [
        [
          607.98,
          335.97
        ],
        [
          607.98,
          214.26
        ]
      ],
      [
        [
          607.98,
          406.26
        ],
        [
          607.98,
          336.21
        ]
      ],
      [
        [
          607.41,
          335.97
        ],
        [
          471.88,
          335.97
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 40,
    "chapter": 2,
    "name": "U",
    "tip": "字母·七巧 · 七块板拼出大写 U",
    "outline": [
      [
        729.441,
        239.942
      ],
      [
        729.441,
        623.942
      ],
      [
        593.677,
        759.707
      ],
      [
        457.912,
        759.707
      ],
      [
        322.148,
        623.942
      ],
      [
        322.148,
        488.178
      ],
      [
        265.912,
        431.942
      ],
      [
        322.148,
        375.707
      ],
      [
        322.148,
        239.942
      ],
      [
        457.912,
        239.942
      ],
      [
        457.912,
        623.942
      ],
      [
        593.677,
        623.942
      ],
      [
        593.677,
        488.178
      ],
      [
        537.441,
        431.942
      ],
      [
        593.677,
        375.707
      ],
      [
        593.677,
        239.942
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 665.441,
        "y": 431.942,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 393.912,
        "y": 431.942,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 638.932,
        "y": 623.942,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 525.794,
        "y": 691.825,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 638.932,
        "y": 285.197,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 367.403,
        "y": 285.197,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 390.03,
        "y": 623.942,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          729.44,
          623.94
        ],
        [
          593.68,
          488.18
        ]
      ],
      [
        [
          593.68,
          375.71
        ],
        [
          729.44,
          239.94
        ]
      ],
      [
        [
          322.15,
          375.71
        ],
        [
          457.91,
          239.94
        ]
      ],
      [
        [
          457.91,
          623.94
        ],
        [
          322.15,
          488.18
        ]
      ],
      [
        [
          593.68,
          759.71
        ],
        [
          593.68,
          623.94
        ]
      ],
      [
        [
          457.91,
          759.71
        ],
        [
          457.91,
          623.94
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 41,
    "chapter": 2,
    "name": "V",
    "tip": "字母·七巧 · 七块板拼出大写 V",
    "outline": [
      [
        523.585,
        454.751
      ],
      [
        603.931,
        374.405
      ],
      [
        603.931,
        238.641
      ],
      [
        739.695,
        238.641
      ],
      [
        739.695,
        510.17
      ],
      [
        468.166,
        781.699
      ],
      [
        332.402,
        645.934
      ],
      [
        427.585,
        550.75
      ],
      [
        331.585,
        454.75
      ],
      [
        291.821,
        494.515
      ],
      [
        291.821,
        358.75
      ],
      [
        427.585,
        222.986
      ],
      [
        563.35,
        222.986
      ],
      [
        427.585,
        358.75
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 649.186,
        "y": 419.66,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 558.676,
        "y": 600.679,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 422.912,
        "y": 645.934,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 427.585,
        "y": 454.75,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 649.186,
        "y": 283.896,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 337.076,
        "y": 404.005,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 427.585,
        "y": 290.868,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          739.7,
          510.17
        ],
        [
          468.17,
          510.17
        ]
      ],
      [
        [
          468.17,
          510.17
        ],
        [
          523.59,
          454.75
        ]
      ],
      [
        [
          603.93,
          374.41
        ],
        [
          739.7,
          238.64
        ]
      ],
      [
        [
          468.17,
          781.7
        ],
        [
          468.17,
          510.17
        ]
      ],
      [
        [
          427.59,
          550.75
        ],
        [
          468.17,
          510.17
        ]
      ],
      [
        [
          331.59,
          454.75
        ],
        [
          427.59,
          358.75
        ]
      ],
      [
        [
          291.82,
          358.75
        ],
        [
          427.59,
          358.75
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 42,
    "chapter": 2,
    "name": "W",
    "tip": "字母·七巧 · 七块板拼出大写 W",
    "outline": [
      [
        770.988,
        771.695
      ],
      [
        499.459,
        500.166
      ],
      [
        227.93,
        771.695
      ],
      [
        227.93,
        364.402
      ],
      [
        363.695,
        228.637
      ],
      [
        363.695,
        500.166
      ],
      [
        499.459,
        364.402
      ],
      [
        635.224,
        500.166
      ],
      [
        635.224,
        228.637
      ],
      [
        770.988,
        364.402
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 680.478,
        "y": 590.676,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 318.44,
        "y": 590.676,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 499.459,
        "y": 454.912,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 295.812,
        "y": 432.284,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 318.44,
        "y": 319.147,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 680.478,
        "y": 454.912,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 703.106,
        "y": 364.402,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          499.46,
          500.17
        ],
        [
          635.22,
          500.17
        ]
      ],
      [
        [
          635.22,
          500.17
        ],
        [
          770.99,
          500.17
        ]
      ],
      [
        [
          363.69,
          500.17
        ],
        [
          499.46,
          500.17
        ]
      ],
      [
        [
          227.93,
          500.17
        ],
        [
          363.69,
          500.17
        ]
      ],
      [
        [
          227.93,
          364.4
        ],
        [
          363.69,
          364.4
        ]
      ],
      [
        [
          635.22,
          364.4
        ],
        [
          770.99,
          500.17
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 43,
    "chapter": 2,
    "name": "X",
    "tip": "字母·七巧 · 七块板拼出大写 X",
    "outline": [
      [
        819.294,
        243.765
      ],
      [
        547.5,
        515.294
      ],
      [
        548.333,
        561.607
      ],
      [
        740.333,
        753.607
      ],
      [
        548.333,
        753.607
      ],
      [
        548.333,
        756
      ],
      [
        452.235,
        660
      ],
      [
        452.235,
        739.765
      ],
      [
        180.706,
        739.765
      ],
      [
        451.5,
        467.5
      ],
      [
        355.833,
        371.833
      ],
      [
        354.15,
        373.517
      ],
      [
        258.15,
        277.517
      ],
      [
        450.317,
        277.683
      ],
      [
        452,
        276
      ],
      [
        547.765,
        371.5
      ],
      [
        547.765,
        243.765
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 638.274,
        "y": 334.274,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 361.726,
        "y": 649.256,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 612.333,
        "y": 689.607,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 452,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 354.15,
        "y": 309.517,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 516.333,
        "y": 660,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.5,
        "y": 515.5,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          547.76,
          515.29
        ],
        [
          547.76,
          371.5
        ]
      ],
      [
        [
          548.33,
          753.61
        ],
        [
          548.33,
          564
        ]
      ],
      [
        [
          356,
          372
        ],
        [
          450.32,
          277.68
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 44,
    "chapter": 2,
    "name": "Y",
    "tip": "字母·七巧 · 七块板拼出大写 Y",
    "outline": [
      [
        839.174,
        208.715
      ],
      [
        567.882,
        480.244
      ],
      [
        567.192,
        608.681
      ],
      [
        569.577,
        606.297
      ],
      [
        569.577,
        798.297
      ],
      [
        377.577,
        798.297
      ],
      [
        567.882,
        609.372
      ],
      [
        555.723,
        596.17
      ],
      [
        363.723,
        788.17
      ],
      [
        363.319,
        404.575
      ],
      [
        296.119,
        337.371
      ],
      [
        296.119,
        344.025
      ],
      [
        160.355,
        208.261
      ],
      [
        296.358,
        208.261
      ],
      [
        296.358,
        201.368
      ],
      [
        432.122,
        201.368
      ],
      [
        432.118,
        337.843
      ],
      [
        567.645,
        473.607
      ],
      [
        567.645,
        208.715
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 658.154,
        "y": 299.224,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 427.723,
        "y": 596.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 505.577,
        "y": 734.297,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.24,
        "y": 269.25,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 250.864,
        "y": 253.516,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.624,
        "y": 382.626,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 473.607,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          363.72,
          404.17
        ],
        [
          432.28,
          472.73
        ]
      ],
      [
        [
          296.36,
          337.13
        ],
        [
          296.36,
          208.26
        ]
      ],
      [
        [
          431.88,
          337.13
        ],
        [
          296.36,
          337.13
        ]
      ],
      [
        [
          431.88,
          337.84
        ],
        [
          431.88,
          473.14
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true,
    "gapFill": [
      {
        "a": "T3",
        "pts": [
          [
            363.723,
            788.17
          ],
          [
            371.95,
            779.943
          ],
          [
            377.577,
            798.297
          ],
          [
            374.587,
            798.297
          ]
        ]
      }
    ]
  },
  {
    "id": 45,
    "chapter": 2,
    "name": "Z",
    "tip": "字母·七巧 · 七块板拼出大写 Z",
    "outline": [
      [
        160.569,
        770.734
      ],
      [
        567.862,
        363.441
      ],
      [
        296.333,
        363.441
      ],
      [
        432.098,
        227.676
      ],
      [
        839.391,
        227.676
      ],
      [
        432.098,
        634.97
      ],
      [
        703.627,
        634.97
      ],
      [
        567.862,
        770.734
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 341.588,
        "y": 680.225,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 658.372,
        "y": 318.186,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.098,
        "y": 318.186,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 499.98,
        "y": 702.852,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.117,
        "y": 680.225,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.608,
        "y": 272.931,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.98,
        "y": 499.205,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          432.1,
          634.97
        ],
        [
          432.1,
          770.73
        ]
      ],
      [
        [
          432.1,
          499.21
        ],
        [
          432.1,
          634.97
        ]
      ],
      [
        [
          567.86,
          363.44
        ],
        [
          567.86,
          227.68
        ]
      ],
      [
        [
          567.86,
          499.21
        ],
        [
          567.86,
          363.44
        ]
      ],
      [
        [
          432.1,
          227.68
        ],
        [
          567.86,
          363.44
        ]
      ],
      [
        [
          567.86,
          634.97
        ],
        [
          567.86,
          770.73
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
      chapNames: ["几何·入门","字母·A–Z"], chapTitles: ["几何","字母"],
      /* v0.50：数据集自带章节表（from 从 1 计，count 关数）。
       * 用户反馈「字母关卡不要分出来，统一放在字母关下，多出的图案做滚动」——
       * 26 个字母合成一章，关卡页 4 列排 7 行，超出视口可上下拖动。 */
      chapters: [
        { name: '几何·入门', title: '几何', from: 1, count: 19 },
        { name: '字母·A–Z', title: '字母', from: 20, count: 26 }
      ],
      completeTitle: '七巧板全部完成', completeSub: '全部 45 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
