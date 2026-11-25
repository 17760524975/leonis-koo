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
        431.94,
        228.38
      ],
      [
        568.06,
        228.38
      ],
      [
        703.81,
        364.13
      ],
      [
        703.81,
        748.38
      ],
      [
        703.44,
        748.38
      ],
      [
        700.44,
        745.25
      ],
      [
        564.69,
        745.25
      ],
      [
        564.69,
        609.5
      ],
      [
        511.56,
        556.5
      ],
      [
        296.56,
        771.63
      ],
      [
        296.19,
        771.63
      ],
      [
        296.19,
        364.13
      ]
    ],
    "holes": [
      [
        [
          432.14,
          500.03
        ],
        [
          567.84,
          500.03
        ],
        [
          567.84,
          364.26
        ],
        [
          432.14,
          364.26
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.82,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 639.67,
        "y": 556.26,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.9,
        "y": 319.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.1,
        "y": 409.52,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 610.01,
        "y": 699.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.26,
        "y": 432.15,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 432.14,
        "y": 296.38,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          567.84,
          500.03
        ],
        [
          511.64,
          556.23
        ]
      ],
      [
        [
          296.38,
          500.03
        ],
        [
          432.14,
          500.03
        ]
      ],
      [
        [
          567.87,
          500.06
        ],
        [
          703.64,
          364.29
        ]
      ],
      [
        [
          700.53,
          745.12
        ],
        [
          564.77,
          609.36
        ]
      ],
      [
        [
          703.61,
          364.26
        ],
        [
          567.85,
          364.26
        ]
      ],
      [
        [
          432.14,
          364.26
        ],
        [
          567.9,
          228.5
        ]
      ],
      [
        [
          296.38,
          364.27
        ],
        [
          432.14,
          364.27
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
        567.88,
        227.38
      ],
      [
        568.25,
        227.38
      ],
      [
        703.75,
        362.88
      ],
      [
        703.75,
        363.5
      ],
      [
        568.38,
        498.75
      ],
      [
        681.25,
        498.88
      ],
      [
        681.25,
        691.13
      ],
      [
        680.88,
        691.13
      ],
      [
        661.75,
        672
      ],
      [
        566,
        767.75
      ],
      [
        570.5,
        772.25
      ],
      [
        570.5,
        772.63
      ],
      [
        298.75,
        772.63
      ],
      [
        298.75,
        501.13
      ],
      [
        296.63,
        503.25
      ],
      [
        296.25,
        503.25
      ],
      [
        296.25,
        231.5
      ],
      [
        567.88,
        231.5
      ]
    ],
    "holes": [
      [
        [
          490.88,
          500.8
        ],
        [
          489.09,
          499.01
        ],
        [
          432.15,
          499
        ],
        [
          567.98,
          363.14
        ],
        [
          567.98,
          231.66
        ],
        [
          298.82,
          500.94
        ]
      ],
      [
        [
          394.78,
          596.9
        ],
        [
          469.72,
          671.84
        ],
        [
          565.82,
          575.74
        ],
        [
          490.88,
          500.8
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 389.33,
        "y": 681.96,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.88,
        "y": 322.17,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 617.09,
        "y": 563.01,
        "angle": 0,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 394.84,
        "y": 532.83,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.23,
        "y": 317.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 565.75,
        "y": 671.81,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 567.92,
        "y": 431.12,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          298.82,
          500.94
        ],
        [
          394.77,
          596.9
        ]
      ],
      [
        [
          469.72,
          671.84
        ],
        [
          565.72,
          767.84
        ]
      ],
      [
        [
          565.82,
          575.74
        ],
        [
          661.82,
          671.74
        ]
      ],
      [
        [
          567.92,
          499.01
        ],
        [
          489.09,
          499.01
        ]
      ],
      [
        [
          703.68,
          363.13
        ],
        [
          567.98,
          363.13
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
        485.63,
        194.63
      ],
      [
        621.75,
        194.63
      ],
      [
        717.63,
        290.5
      ],
      [
        717.63,
        291
      ],
      [
        621.75,
        386.88
      ],
      [
        621.38,
        386.88
      ],
      [
        621.38,
        330.63
      ],
      [
        485.88,
        330.63
      ],
      [
        485.88,
        578.63
      ],
      [
        565.38,
        658
      ],
      [
        700.75,
        522.5
      ],
      [
        701.13,
        522.5
      ],
      [
        701.13,
        658.5
      ],
      [
        565.5,
        794.13
      ],
      [
        429.63,
        794.13
      ],
      [
        418.5,
        805.38
      ],
      [
        418,
        805.38
      ],
      [
        282.38,
        669.75
      ],
      [
        282.38,
        669.38
      ],
      [
        554,
        669.38
      ],
      [
        564.88,
        658.38
      ],
      [
        293.63,
        658.38
      ],
      [
        293.63,
        386.63
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 384.26,
        "y": 567.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 421.75,
        "y": 386.75,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 418.26,
        "y": 714.78,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 655.79,
        "y": 613.02,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 653.52,
        "y": 290.75,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 553.64,
        "y": 262.63,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 565.28,
        "y": 726.16,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          293.75,
          386.75
        ],
        [
          485.75,
          578.75
        ]
      ],
      [
        [
          485.75,
          194.75
        ],
        [
          485.75,
          330.51
        ]
      ],
      [
        [
          429.51,
          794.04
        ],
        [
          554.02,
          669.53
        ]
      ],
      [
        [
          701.04,
          658.27
        ],
        [
          565.28,
          658.27
        ]
      ],
      [
        [
          621.52,
          330.51
        ],
        [
          621.52,
          194.75
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
        293.87,
        227.06
      ],
      [
        565.63,
        227.06
      ],
      [
        565.63,
        227.44
      ],
      [
        563.38,
        229.56
      ],
      [
        563.38,
        229.81
      ],
      [
        698.88,
        365.19
      ],
      [
        698.88,
        501.06
      ],
      [
        703.5,
        501.06
      ],
      [
        703.5,
        636.94
      ],
      [
        706.13,
        636.94
      ],
      [
        706.13,
        637.31
      ],
      [
        570.5,
        772.94
      ],
      [
        570.13,
        772.94
      ],
      [
        566.63,
        769.31
      ],
      [
        295,
        769.31
      ],
      [
        295,
        498.06
      ],
      [
        294.25,
        498.81
      ],
      [
        293.87,
        498.81
      ]
    ],
    "holes": [
      [
        [
          295.1,
          497.61
        ],
        [
          434.53,
          637.03
        ],
        [
          567.58,
          637.03
        ],
        [
          567.58,
          501.23
        ],
        [
          562.84,
          501.21
        ],
        [
          562.8,
          365.44
        ],
        [
          427.04,
          365.68
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 385.61,
        "y": 678.63,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 384.51,
        "y": 317.7,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 570.29,
        "y": 682.29,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 608.09,
        "y": 455.95,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 517.55,
        "y": 320.42,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 635.46,
        "y": 569.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 630.91,
        "y": 365.47,
        "angle": 225,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          434.53,
          637.04
        ],
        [
          566.63,
          769.14
        ]
      ],
      [
        [
          562.81,
          229.91
        ],
        [
          427.04,
          365.68
        ]
      ],
      [
        [
          703.34,
          637.04
        ],
        [
          567.58,
          637.04
        ]
      ],
      [
        [
          698.6,
          501.2
        ],
        [
          567.58,
          501.2
        ]
      ],
      [
        [
          562.95,
          365.55
        ],
        [
          698.6,
          501.2
        ]
      ],
      [
        [
          562.8,
          229.91
        ],
        [
          562.8,
          365.47
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
        297.5,
        228.31
      ],
      [
        705,
        228.31
      ],
      [
        705,
        228.69
      ],
      [
        569.38,
        364.19
      ],
      [
        569.38,
        364.44
      ],
      [
        433.63,
        364.44
      ],
      [
        433.63,
        428.56
      ],
      [
        569.38,
        428.56
      ],
      [
        569.38,
        564.56
      ],
      [
        433.63,
        564.56
      ],
      [
        433.63,
        635.69
      ],
      [
        569.5,
        635.69
      ],
      [
        705.13,
        771.31
      ],
      [
        705.13,
        771.69
      ],
      [
        569.13,
        771.69
      ],
      [
        566.63,
        769.06
      ],
      [
        294.88,
        769.06
      ],
      [
        294.88,
        497.31
      ],
      [
        295.25,
        497.31
      ],
      [
        297.5,
        499.56
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 385.51,
        "y": 678.37,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 388.17,
        "y": 319,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 388.23,
        "y": 500.02,
        "angle": 225,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 523.93,
        "y": 319,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 614.45,
        "y": 273.69,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 501.41,
        "y": 496.53,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 569.25,
        "y": 703.66,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          297.7,
          500.05
        ],
        [
          433.46,
          635.81
        ]
      ],
      [
        [
          433.46,
          635.81
        ],
        [
          566.53,
          768.88
        ]
      ],
      [
        [
          433.45,
          364.23
        ],
        [
          297.69,
          499.99
        ]
      ],
      [
        [
          569.19,
          228.49
        ],
        [
          433.42,
          364.26
        ]
      ],
      [
        [
          433.48,
          564.41
        ],
        [
          433.48,
          428.65
        ]
      ],
      [
        [
          569.18,
          228.49
        ],
        [
          569.18,
          364.2
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 25,
    "chapter": 2,
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出大写 F",
    "outline": [
      [
        570.94,
        201.63
      ],
      [
        706.94,
        201.63
      ],
      [
        706.94,
        202
      ],
      [
        697.94,
        210.88
      ],
      [
        697.94,
        346.75
      ],
      [
        561.94,
        346.75
      ],
      [
        561.94,
        346.38
      ],
      [
        570.69,
        337.63
      ],
      [
        435.56,
        337.63
      ],
      [
        435.56,
        473.25
      ],
      [
        683.56,
        473.25
      ],
      [
        683.56,
        473.63
      ],
      [
        491.81,
        665.38
      ],
      [
        491.31,
        665.38
      ],
      [
        488.69,
        662.63
      ],
      [
        429.06,
        662.63
      ],
      [
        429.06,
        798.38
      ],
      [
        293.06,
        798.38
      ],
      [
        293.06,
        662.38
      ],
      [
        296.56,
        662.38
      ],
      [
        296.56,
        470.5
      ],
      [
        296.94,
        470.5
      ],
      [
        299.31,
        472.88
      ],
      [
        299.31,
        201.75
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 491.55,
        "y": 537.32,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 389.99,
        "y": 292.34,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 360.66,
        "y": 598.54,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 390.13,
        "y": 428.05,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 652.61,
        "y": 301.32,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 361.07,
        "y": 730.43,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 571.16,
        "y": 269.63,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          488.72,
          662.49
        ],
        [
          299.55,
          473.32
        ]
      ],
      [
        [
          299.62,
          473.32
        ],
        [
          435.38,
          473.32
        ]
      ],
      [
        [
          435.34,
          337.5
        ],
        [
          299.58,
          473.26
        ]
      ],
      [
        [
          571.01,
          201.83
        ],
        [
          435.36,
          337.48
        ]
      ],
      [
        [
          428.95,
          662.54
        ],
        [
          296.66,
          662.54
        ]
      ],
      [
        [
          571.16,
          337.51
        ],
        [
          697.86,
          210.81
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
        488.25,
        200.25
      ],
      [
        624.25,
        200.25
      ],
      [
        624.25,
        200.63
      ],
      [
        488.5,
        336.25
      ],
      [
        488.5,
        584.25
      ],
      [
        567.88,
        663.63
      ],
      [
        607.38,
        624.25
      ],
      [
        607.38,
        624
      ],
      [
        511.63,
        528.38
      ],
      [
        511.63,
        527.88
      ],
      [
        607.5,
        432
      ],
      [
        607.88,
        432
      ],
      [
        703.75,
        527.88
      ],
      [
        703.75,
        664.13
      ],
      [
        568.13,
        799.75
      ],
      [
        431.88,
        799.75
      ],
      [
        296.25,
        664.13
      ],
      [
        296.25,
        392.25
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 386.88,
        "y": 573.39,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 424.38,
        "y": 392.38,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.14,
        "y": 709.16,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 522.65,
        "y": 754.41,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 533.63,
        "y": 245.63,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 607.67,
        "y": 528.14,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.79,
        "y": 663.9,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          296.38,
          392.38
        ],
        [
          488.38,
          584.38
        ]
      ],
      [
        [
          567.9,
          663.9
        ],
        [
          296.38,
          663.9
        ]
      ],
      [
        [
          488.38,
          200.38
        ],
        [
          488.38,
          336.14
        ]
      ],
      [
        [
          432.14,
          799.67
        ],
        [
          567.9,
          663.91
        ]
      ],
      [
        [
          567.9,
          663.9
        ],
        [
          567.9,
          799.66
        ]
      ],
      [
        [
          703.67,
          528.14
        ],
        [
          607.67,
          624.14
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 27,
    "chapter": 2,
    "name": "H",
    "tip": "字母·七巧 · 七块板拼出大写 H",
    "outline": [
      [
        294.13,
        228.37
      ],
      [
        294.5,
        228.37
      ],
      [
        297.88,
        231.87
      ],
      [
        433.63,
        231.87
      ],
      [
        433.63,
        367.62
      ],
      [
        572.5,
        367.62
      ],
      [
        572.5,
        231.87
      ],
      [
        708.5,
        231.87
      ],
      [
        708.5,
        367.87
      ],
      [
        705.13,
        367.87
      ],
      [
        705.13,
        639.25
      ],
      [
        704.75,
        639.25
      ],
      [
        701.75,
        636.25
      ],
      [
        701.75,
        771.63
      ],
      [
        701.38,
        771.63
      ],
      [
        565.75,
        636
      ],
      [
        565.75,
        500.13
      ],
      [
        483.75,
        500.13
      ],
      [
        433,
        550.88
      ],
      [
        433,
        686.63
      ],
      [
        297.25,
        686.63
      ],
      [
        291.88,
        692.13
      ],
      [
        291.5,
        692.13
      ],
      [
        291.5,
        499.88
      ],
      [
        294.13,
        499.88
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 384.79,
        "y": 409.52,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 614.52,
        "y": 458.23,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 355.62,
        "y": 564.03,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 387.63,
        "y": 641.28,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388.25,
        "y": 277.21,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 640.51,
        "y": 299.84,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 633.73,
        "y": 635.83,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          433.5,
          367.72
        ],
        [
          565.81,
          500.03
        ]
      ],
      [
        [
          483.62,
          500.03
        ],
        [
          294.28,
          500.03
        ]
      ],
      [
        [
          297.74,
          231.96
        ],
        [
          433.5,
          367.72
        ]
      ],
      [
        [
          572.63,
          367.72
        ],
        [
          705.03,
          367.72
        ]
      ],
      [
        [
          701.61,
          635.83
        ],
        [
          565.85,
          500.07
        ]
      ],
      [
        [
          432.88,
          550.77
        ],
        [
          297.12,
          686.53
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 28,
    "chapter": 2,
    "name": "I",
    "tip": "字母·七巧 · 七块板拼出大写 I",
    "outline": [
      [
        332.44,
        193.81
      ],
      [
        716.56,
        193.81
      ],
      [
        716.56,
        194.19
      ],
      [
        620.69,
        289.94
      ],
      [
        620.69,
        481.31
      ],
      [
        627.06,
        474.94
      ],
      [
        627.44,
        474.94
      ],
      [
        627.44,
        666.94
      ],
      [
        694.44,
        666.94
      ],
      [
        694.44,
        802.94
      ],
      [
        422.56,
        802.94
      ],
      [
        419.44,
        806.19
      ],
      [
        283.44,
        806.19
      ],
      [
        283.44,
        805.81
      ],
      [
        419.06,
        670.19
      ],
      [
        424.81,
        670.19
      ],
      [
        424.81,
        286.44
      ],
      [
        332.44,
        194.19
      ]
    ],
    "holes": [
      [
        [
          435.37,
          667
        ],
        [
          620.52,
          481.85
        ],
        [
          616.91,
          478.4
        ],
        [
          424.91,
          670.25
        ],
        [
          555.12,
          670.28
        ],
        [
          558.5,
          667
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 524.53,
        "y": 257.94,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 488.91,
        "y": 478.4,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 563.37,
        "y": 603,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 588.57,
        "y": 385.9,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 513.15,
        "y": 757.51,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 626.38,
        "y": 734.95,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 419.33,
        "y": 738.13,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          524.53,
          385.94
        ],
        [
          424.95,
          286.36
        ]
      ],
      [
        [
          620.57,
          289.9
        ],
        [
          524.57,
          385.9
        ]
      ],
      [
        [
          524.49,
          385.98
        ],
        [
          616.91,
          478.4
        ]
      ],
      [
        [
          558.5,
          667
        ],
        [
          627.37,
          667
        ]
      ],
      [
        [
          558.4,
          667.07
        ],
        [
          558.4,
          802.76
        ]
      ],
      [
        [
          422.64,
          802.76
        ],
        [
          555.13,
          670.28
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
        164
      ],
      [
        740.13,
        164
      ],
      [
        740.13,
        164.38
      ],
      [
        644.13,
        260.25
      ],
      [
        644.13,
        451.75
      ],
      [
        644.5,
        451.75
      ],
      [
        644.5,
        643.88
      ],
      [
        548.5,
        740
      ],
      [
        544.38,
        740
      ],
      [
        448.5,
        836
      ],
      [
        448,
        836
      ],
      [
        352.13,
        740.13
      ],
      [
        352.13,
        739.75
      ],
      [
        355.5,
        739.63
      ],
      [
        259.88,
        644.13
      ],
      [
        259.88,
        643.75
      ],
      [
        355.75,
        547.88
      ],
      [
        356.25,
        547.88
      ],
      [
        451.88,
        643.5
      ],
      [
        451.88,
        260.13
      ],
      [
        356,
        164.38
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 228.13,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 516,
        "y": 452.13,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 580.34,
        "y": 579.78,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 612,
        "y": 356.13,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 448.25,
        "y": 771.91,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 356,
        "y": 643.91,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500.3,
        "y": 691.82,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          548,
          356.13
        ],
        [
          452,
          260.13
        ]
      ],
      [
        [
          644,
          260.13
        ],
        [
          548,
          356.13
        ]
      ],
      [
        [
          644,
          452.13
        ],
        [
          452.35,
          643.79
        ]
      ],
      [
        [
          548,
          356.13
        ],
        [
          644,
          452.13
        ]
      ],
      [
        [
          452.34,
          643.78
        ],
        [
          644.3,
          643.78
        ]
      ],
      [
        [
          356.3,
          739.91
        ],
        [
          544.25,
          739.91
        ]
      ],
      [
        [
          452,
          643.91
        ],
        [
          356.19,
          739.72
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 30,
    "chapter": 2,
    "name": "K",
    "tip": "字母·七巧 · 七块板拼出大写 K",
    "outline": [
      [
        557.81,
        192
      ],
      [
        558.19,
        192
      ],
      [
        654.06,
        287.87
      ],
      [
        654.06,
        288.37
      ],
      [
        462.31,
        480
      ],
      [
        462.31,
        480.25
      ],
      [
        733.56,
        751.38
      ],
      [
        733.56,
        751.75
      ],
      [
        597.56,
        751.75
      ],
      [
        461.94,
        616.13
      ],
      [
        270.19,
        808
      ],
      [
        269.81,
        808
      ],
      [
        269.81,
        424.37
      ],
      [
        266.81,
        427.37
      ],
      [
        266.44,
        427.37
      ],
      [
        266.44,
        235.12
      ],
      [
        458.56,
        235.12
      ],
      [
        461.69,
        231.87
      ],
      [
        462.06,
        231.87
      ],
      [
        462.19,
        287.75
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 397.97,
        "y": 423.89,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 333.97,
        "y": 615.89,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 330.56,
        "y": 299.3,
        "angle": 270,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 507.23,
        "y": 570.63,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 494.02,
        "y": 384.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 557.97,
        "y": 288.12,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 597.74,
        "y": 683.77,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          461.97,
          615.89
        ],
        [
          269.97,
          423.89
        ]
      ],
      [
        [
          269.97,
          423.89
        ],
        [
          458.56,
          235.3
        ]
      ],
      [
        [
          461.97,
          480.12
        ],
        [
          461.97,
          615.88
        ]
      ],
      [
        [
          461.97,
          288.17
        ],
        [
          461.97,
          480.17
        ]
      ],
      [
        [
          597.74,
          615.88
        ],
        [
          461.98,
          615.88
        ]
      ],
      [
        [
          462.02,
          288.17
        ],
        [
          557.97,
          384.12
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 31,
    "chapter": 2,
    "name": "L",
    "tip": "字母·七巧 · 七块板拼出大写 L",
    "outline": [
      [
        274.56,
        208.87
      ],
      [
        466.81,
        208.87
      ],
      [
        466.81,
        593.13
      ],
      [
        558.94,
        685.25
      ],
      [
        593.06,
        651.13
      ],
      [
        729.06,
        651.13
      ],
      [
        729.06,
        651.5
      ],
      [
        725.06,
        655.38
      ],
      [
        725.06,
        791.13
      ],
      [
        589.19,
        791.13
      ],
      [
        589.19,
        790.75
      ],
      [
        592.81,
        787.13
      ],
      [
        457.44,
        787.13
      ],
      [
        457.44,
        786.75
      ],
      [
        462.56,
        781.63
      ],
      [
        270.94,
        781.63
      ],
      [
        270.94,
        397.25
      ],
      [
        271.31,
        397.25
      ],
      [
        274.56,
        400.5
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 402.74,
        "y": 401.05,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 335.07,
        "y": 589.38,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 338.71,
        "y": 273,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 366.94,
        "y": 749.51,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 679.71,
        "y": 745.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 462.98,
        "y": 685.47,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 593.19,
        "y": 719.14,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          463.07,
          589.38
        ],
        [
          274.74,
          401.05
        ]
      ],
      [
        [
          274.75,
          401.04
        ],
        [
          466.74,
          209.05
        ]
      ],
      [
        [
          366.94,
          685.51
        ],
        [
          271.07,
          781.38
        ]
      ],
      [
        [
          462.98,
          589.47
        ],
        [
          366.98,
          685.47
        ]
      ],
      [
        [
          366.94,
          685.51
        ],
        [
          462.94,
          781.51
        ]
      ],
      [
        [
          593.19,
          787.02
        ],
        [
          724.96,
          655.24
        ]
      ],
      [
        [
          558.98,
          685.47
        ],
        [
          462.98,
          781.47
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
        312.81,
        217.75
      ],
      [
        313.19,
        217.75
      ],
      [
        504.94,
        409.63
      ],
      [
        505.19,
        409.63
      ],
      [
        692.06,
        222.63
      ],
      [
        692.44,
        222.63
      ],
      [
        692.44,
        606.5
      ],
      [
        732.19,
        646.13
      ],
      [
        732.19,
        782.25
      ],
      [
        596.06,
        782.13
      ],
      [
        596.19,
        511.13
      ],
      [
        500.56,
        606.75
      ],
      [
        500.19,
        606.75
      ],
      [
        404.44,
        511
      ],
      [
        404.44,
        782.25
      ],
      [
        404.06,
        782.25
      ],
      [
        403.56,
        781.63
      ],
      [
        267.81,
        781.63
      ],
      [
        267.81,
        645.75
      ],
      [
        268.19,
        645.75
      ],
      [
        268.56,
        646.13
      ],
      [
        312.81,
        601.88
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 628.35,
        "y": 414.65,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 376.99,
        "y": 409.87,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 359.06,
        "y": 646.38,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 313.19,
        "y": 736.28,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 641.45,
        "y": 736.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500.35,
        "y": 510.65,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 664.23,
        "y": 646.41,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          596.35,
          510.65
        ],
        [
          500.35,
          414.65
        ]
      ],
      [
        [
          692.35,
          606.65
        ],
        [
          596.35,
          510.65
        ]
      ],
      [
        [
          404.28,
          510.58
        ],
        [
          312.99,
          601.87
        ]
      ],
      [
        [
          500.28,
          414.58
        ],
        [
          404.28,
          510.58
        ]
      ],
      [
        [
          403.7,
          781.53
        ],
        [
          268.55,
          646.38
        ]
      ],
      [
        [
          596.35,
          646.41
        ],
        [
          731.96,
          782.02
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
        567.75,
        228.38
      ],
      [
        703.75,
        228.38
      ],
      [
        703.75,
        748.25
      ],
      [
        703.38,
        748.25
      ],
      [
        511.63,
        556.5
      ],
      [
        432.25,
        635.88
      ],
      [
        432.25,
        771.63
      ],
      [
        296.25,
        771.63
      ],
      [
        296.25,
        228.5
      ],
      [
        296.63,
        228.5
      ],
      [
        567.75,
        499.63
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 639.67,
        "y": 556.27,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.88,
        "y": 409.52,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 613.16,
        "y": 364.26,
        "angle": 45,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 341.63,
        "y": 545.28,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 658.41,
        "y": 273.76,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.26,
        "y": 703.68,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 432.14,
        "y": 567.91,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          567.91,
          500.03
        ],
        [
          703.67,
          364.27
        ]
      ],
      [
        [
          511.67,
          556.27
        ],
        [
          567.91,
          500.03
        ]
      ],
      [
        [
          432.14,
          500.03
        ],
        [
          296.38,
          500.03
        ]
      ],
      [
        [
          567.9,
          500.03
        ],
        [
          432.14,
          500.03
        ]
      ],
      [
        [
          703.67,
          364.26
        ],
        [
          567.91,
          228.5
        ]
      ],
      [
        [
          432.14,
          500.03
        ],
        [
          296.38,
          635.79
        ]
      ],
      [
        [
          296.38,
          635.8
        ],
        [
          432.14,
          635.8
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
        412,
        220.12
      ],
      [
        683.88,
        220.12
      ],
      [
        683.88,
        684
      ],
      [
        588,
        779.88
      ],
      [
        316.13,
        779.88
      ],
      [
        316.13,
        316
      ]
    ],
    "holes": [
      [
        [
          587.78,
          395.78
        ],
        [
          508.25,
          316.25
        ],
        [
          412.25,
          412.25
        ],
        [
          412.25,
          604.25
        ],
        [
          491.78,
          683.78
        ],
        [
          587.78,
          587.78
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 593.27,
        "y": 310.76,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 406.76,
        "y": 689.27,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 619.78,
        "y": 619.78,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 587.78,
        "y": 715.78,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 619.78,
        "y": 491.78,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 412.25,
        "y": 316.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 364.25,
        "y": 460.25,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          683.78,
          491.78
        ],
        [
          587.78,
          395.78
        ]
      ],
      [
        [
          508.25,
          316.25
        ],
        [
          412.25,
          220.25
        ]
      ],
      [
        [
          491.78,
          683.78
        ],
        [
          587.78,
          779.78
        ]
      ],
      [
        [
          316.25,
          508.25
        ],
        [
          412.25,
          604.25
        ]
      ],
      [
        [
          491.78,
          683.78
        ],
        [
          683.78,
          683.78
        ]
      ],
      [
        [
          683.78,
          491.78
        ],
        [
          587.78,
          587.78
        ]
      ],
      [
        [
          412.25,
          412.25
        ],
        [
          316.25,
          316.25
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 35,
    "chapter": 2,
    "name": "P",
    "tip": "字母·七巧 · 七块板拼出大写 P",
    "outline": [
      [
        571.44,
        228.25
      ],
      [
        571.81,
        228.25
      ],
      [
        707.44,
        363.88
      ],
      [
        707.44,
        364.25
      ],
      [
        700.06,
        364.25
      ],
      [
        700.06,
        499.88
      ],
      [
        702.06,
        499.88
      ],
      [
        702.06,
        500.25
      ],
      [
        566.44,
        635.88
      ],
      [
        430.44,
        635.88
      ],
      [
        430.44,
        770
      ],
      [
        294.56,
        770
      ],
      [
        292.94,
        771.75
      ],
      [
        292.56,
        771.75
      ],
      [
        292.56,
        500
      ],
      [
        299.69,
        500
      ],
      [
        299.69,
        228.5
      ],
      [
        571.31,
        228.5
      ]
    ],
    "holes": [
      [
        [
          564.23,
          364.14
        ],
        [
          435.86,
          364.13
        ],
        [
          435.91,
          500.02
        ],
        [
          564.23,
          500
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 390.35,
        "y": 319.13,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 383.2,
        "y": 590.68,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 571.63,
        "y": 318.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 385.05,
        "y": 724.62,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 390.66,
        "y": 454.77,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 632.11,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 566.18,
        "y": 567.91,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          571.37,
          228.62
        ],
        [
          435.86,
          364.13
        ]
      ],
      [
        [
          435.82,
          364.17
        ],
        [
          300.06,
          499.93
        ]
      ],
      [
        [
          430.29,
          634.1
        ],
        [
          294.53,
          769.86
        ]
      ],
      [
        [
          300.15,
          500.17
        ],
        [
          435.91,
          500.17
        ]
      ],
      [
        [
          699.99,
          364.13
        ],
        [
          564.23,
          364.13
        ]
      ],
      [
        [
          699.99,
          500
        ],
        [
          566.18,
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
        453.31,
        211
      ],
      [
        453.69,
        211
      ],
      [
        645.56,
        402.88
      ],
      [
        645.56,
        403.25
      ],
      [
        645.06,
        403.25
      ],
      [
        645.06,
        595.38
      ],
      [
        643.44,
        597
      ],
      [
        739.31,
        692.75
      ],
      [
        739.31,
        693.13
      ],
      [
        643.44,
        789
      ],
      [
        642.94,
        789
      ],
      [
        547.31,
        693.25
      ],
      [
        547.06,
        693.25
      ],
      [
        453.19,
        787.25
      ],
      [
        452.56,
        787.25
      ],
      [
        260.69,
        595.25
      ],
      [
        260.69,
        403.13
      ],
      [
        261.44,
        403.13
      ],
      [
        261.44,
        402.88
      ]
    ],
    "holes": [
      [
        [
          548.9,
          499.07
        ],
        [
          452.87,
          403.13
        ],
        [
          452.87,
          595.12
        ],
        [
          548.95,
          691.12
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 453.54,
        "y": 339.13,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 388.87,
        "y": 595.2,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 324.81,
        "y": 467.2,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 484.95,
        "y": 691.12,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 548.84,
        "y": 435.13,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 643.15,
        "y": 692.92,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596.95,
        "y": 547.12,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          452.81,
          403.13
        ],
        [
          261.54,
          403.13
        ]
      ],
      [
        [
          644.84,
          403.13
        ],
        [
          452.84,
          403.13
        ]
      ],
      [
        [
          260.87,
          595.2
        ],
        [
          452.84,
          403.23
        ]
      ],
      [
        [
          452.87,
          595.12
        ],
        [
          452.87,
          787.12
        ]
      ],
      [
        [
          644.84,
          403.13
        ],
        [
          548.9,
          499.07
        ]
      ],
      [
        [
          548.95,
          691.12
        ],
        [
          643.15,
          596.92
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
        568.81,
        228.31
      ],
      [
        569.19,
        228.31
      ],
      [
        704.81,
        363.94
      ],
      [
        704.81,
        500.19
      ],
      [
        569.44,
        500.19
      ],
      [
        704.81,
        635.56
      ],
      [
        704.81,
        771.69
      ],
      [
        704.44,
        771.69
      ],
      [
        568.81,
        636.06
      ],
      [
        568.81,
        500.44
      ],
      [
        435.69,
        633.44
      ],
      [
        435.69,
        769.31
      ],
      [
        299.81,
        769.31
      ],
      [
        297.69,
        771.56
      ],
      [
        297.31,
        771.56
      ],
      [
        297.31,
        500.44
      ],
      [
        295.56,
        502.19
      ],
      [
        295.19,
        502.19
      ],
      [
        295.19,
        230.44
      ],
      [
        566.81,
        230.44
      ]
    ],
    "holes": [
      [
        [
          433.26,
          500.05
        ],
        [
          568.94,
          500.05
        ],
        [
          568.94,
          364.2
        ],
        [
          433.26,
          364.2
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 387.92,
        "y": 590.56,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.82,
        "y": 321.13,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.02,
        "y": 318.95,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 388,
        "y": 454.71,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 390.34,
        "y": 723.9,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 636.82,
        "y": 432.17,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 636.82,
        "y": 635.82,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          297.49,
          500.05
        ],
        [
          433.25,
          500.05
        ]
      ],
      [
        [
          435.6,
          633.39
        ],
        [
          299.83,
          769.16
        ]
      ],
      [
        [
          566.84,
          230.62
        ],
        [
          433.26,
          364.2
        ]
      ],
      [
        [
          433.26,
          364.2
        ],
        [
          297.49,
          499.97
        ]
      ],
      [
        [
          704.7,
          364.2
        ],
        [
          568.94,
          364.2
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
        431.88,
        183.75
      ],
      [
        568.13,
        183.75
      ],
      [
        703.75,
        319.37
      ],
      [
        703.75,
        319.75
      ],
      [
        432.25,
        319.75
      ],
      [
        432.25,
        432
      ],
      [
        568.13,
        432
      ],
      [
        760,
        623.88
      ],
      [
        760,
        624.25
      ],
      [
        568,
        816.25
      ],
      [
        432,
        816.25
      ],
      [
        296.38,
        680.63
      ],
      [
        296.38,
        680.25
      ],
      [
        431.75,
        680.25
      ],
      [
        420,
        668.5
      ],
      [
        420,
        668.13
      ],
      [
        555.88,
        668.13
      ],
      [
        555.88,
        803.88
      ],
      [
        567.75,
        815.63
      ],
      [
        567.75,
        568
      ],
      [
        431.88,
        568
      ],
      [
        240,
        376.12
      ],
      [
        240,
        375.75
      ],
      [
        253.5,
        362.37
      ],
      [
        253.5,
        362.12
      ],
      [
        261.25,
        354.37
      ],
      [
        261.5,
        354.37
      ],
      [
        272,
        343.87
      ],
      [
        272,
        343.62
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 631.89,
        "y": 624.11,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 368.13,
        "y": 375.88,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.89,
        "y": 274.39,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 477.38,
        "y": 229.13,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 510.53,
        "y": 713.49,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500.01,
        "y": 499.99,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 432.12,
        "y": 748.22,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.89,
          567.87
        ],
        [
          567.89,
          432.11
        ]
      ],
      [
        [
          432.13,
          183.88
        ],
        [
          432.13,
          319.64
        ]
      ],
      [
        [
          432.13,
          432.11
        ],
        [
          432.13,
          567.87
        ]
      ],
      [
        [
          432.13,
          319.64
        ],
        [
          567.89,
          183.88
        ]
      ],
      [
        [
          555.78,
          804
        ],
        [
          432.12,
          680.34
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
        607.44,
        200.25
      ],
      [
        799.69,
        200.25
      ],
      [
        799.69,
        200.63
      ],
      [
        607.69,
        392.5
      ],
      [
        607.81,
        609.25
      ],
      [
        607.44,
        609.25
      ],
      [
        606.19,
        608
      ],
      [
        414.56,
        799.75
      ],
      [
        414.19,
        799.75
      ],
      [
        414.19,
        415.88
      ],
      [
        339.19,
        340.88
      ],
      [
        203.31,
        340.88
      ],
      [
        203.31,
        205
      ],
      [
        200.31,
        202.13
      ],
      [
        200.31,
        201.75
      ],
      [
        607.44,
        201.75
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 478.25,
        "y": 607.81,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 381.33,
        "y": 292.38,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 671.61,
        "y": 264.38,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 562.35,
        "y": 382.89,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 248.69,
        "y": 295.51,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 539.72,
        "y": 269.75,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 539.77,
        "y": 473.44,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          414.25,
          415.81
        ],
        [
          471.84,
          473.4
        ]
      ],
      [
        [
          471.88,
          473.44
        ],
        [
          606.25,
          607.81
        ]
      ],
      [
        [
          339.2,
          340.76
        ],
        [
          203.44,
          205
        ]
      ],
      [
        [
          471.84,
          201.87
        ],
        [
          471.84,
          337.63
        ]
      ],
      [
        [
          471.84,
          337.68
        ],
        [
          471.84,
          473.4
        ]
      ],
      [
        [
          607.61,
          392.38
        ],
        [
          607.61,
          337.64
        ]
      ],
      [
        [
          607.61,
          337.63
        ],
        [
          607.61,
          201.87
        ]
      ],
      [
        [
          471.84,
          337.64
        ],
        [
          607.6,
          337.64
        ]
      ],
      [
        [
          607.6,
          473.4
        ],
        [
          471.88,
          337.68
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
        731.81,
        239.88
      ],
      [
        732.19,
        239.88
      ],
      [
        732.19,
        623.88
      ],
      [
        731.44,
        623.63
      ],
      [
        596.06,
        759.13
      ],
      [
        595.69,
        759.13
      ],
      [
        595.69,
        755
      ],
      [
        460.06,
        755
      ],
      [
        460.06,
        760.13
      ],
      [
        459.69,
        760.13
      ],
      [
        324.06,
        624.5
      ],
      [
        324.06,
        488.63
      ],
      [
        267.81,
        432.5
      ],
      [
        267.81,
        432.13
      ],
      [
        323.19,
        376.88
      ],
      [
        323.19,
        241.13
      ],
      [
        458.94,
        241.13
      ],
      [
        459.69,
        240.25
      ],
      [
        460.06,
        240.25
      ],
      [
        460.06,
        619
      ],
      [
        595.69,
        619
      ],
      [
        595.69,
        487.63
      ],
      [
        540.06,
        432.13
      ],
      [
        540.06,
        431.63
      ],
      [
        587.81,
        384
      ],
      [
        587.81,
        248.13
      ],
      [
        723.69,
        248.13
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 668.1,
        "y": 431.88,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 395.94,
        "y": 432.3,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 641.05,
        "y": 623.34,
        "angle": 45,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 633.21,
        "y": 293.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 368.52,
        "y": 286.45,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 527.89,
        "y": 687.04,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 392.05,
        "y": 624.32,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          731.56,
          623.34
        ],
        [
          595.8,
          487.58
        ]
      ],
      [
        [
          587.96,
          384.02
        ],
        [
          723.72,
          248.26
        ]
      ],
      [
        [
          323.27,
          376.97
        ],
        [
          459.04,
          241.2
        ]
      ],
      [
        [
          459.94,
          624.3
        ],
        [
          324.18,
          488.54
        ]
      ],
      [
        [
          595.8,
          619.16
        ],
        [
          595.8,
          754.92
        ]
      ],
      [
        [
          460.01,
          754.92
        ],
        [
          460.01,
          624.32
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
        295.88,
        227.87
      ],
      [
        431.88,
        227.87
      ],
      [
        431.88,
        363.25
      ],
      [
        435.75,
        359.37
      ],
      [
        436.13,
        359.37
      ],
      [
        436.13,
        495.38
      ],
      [
        432.75,
        498.63
      ],
      [
        432.75,
        499.88
      ],
      [
        566.5,
        366.25
      ],
      [
        566.5,
        230.37
      ],
      [
        702.38,
        230.37
      ],
      [
        703.88,
        228.75
      ],
      [
        704.25,
        228.75
      ],
      [
        704.38,
        500.63
      ],
      [
        432.88,
        772.13
      ],
      [
        432.5,
        772.13
      ],
      [
        432.5,
        770.38
      ],
      [
        296.75,
        634.75
      ],
      [
        296.75,
        634.38
      ],
      [
        300.13,
        631.13
      ],
      [
        300.13,
        495.5
      ],
      [
        296,
        499.63
      ],
      [
        295.63,
        499.63
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 613.64,
        "y": 409.78,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 523.19,
        "y": 590.94,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 387.38,
        "y": 634.55,
        "angle": 225,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 341,
        "y": 409.09,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 611.84,
        "y": 275.76,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 363.83,
        "y": 295.88,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 368.13,
        "y": 495.23,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          704.15,
          500.29
        ],
        [
          432.68,
          500.29
        ]
      ],
      [
        [
          566.61,
          366.3
        ],
        [
          702.38,
          230.53
        ]
      ],
      [
        [
          432.68,
          770.31
        ],
        [
          432.68,
          500.43
        ]
      ],
      [
        [
          432.63,
          498.79
        ],
        [
          300.34,
          631.08
        ]
      ],
      [
        [
          295.95,
          363.84
        ],
        [
          431.51,
          363.84
        ]
      ],
      [
        [
          431.51,
          363.84
        ],
        [
          300.18,
          495.16
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
        372.44,
        228.38
      ],
      [
        372.81,
        228.38
      ],
      [
        372.81,
        364.38
      ],
      [
        363.19,
        364.38
      ],
      [
        363.19,
        499.63
      ],
      [
        498.69,
        364.13
      ],
      [
        499.06,
        364.13
      ],
      [
        634.56,
        499.63
      ],
      [
        634.56,
        364.13
      ],
      [
        634.94,
        364.13
      ],
      [
        636.81,
        366
      ],
      [
        636.81,
        230.38
      ],
      [
        637.19,
        230.38
      ],
      [
        772.81,
        366
      ],
      [
        772.81,
        502
      ],
      [
        772.44,
        502
      ],
      [
        770.81,
        500.38
      ],
      [
        770.81,
        771.63
      ],
      [
        770.44,
        771.63
      ],
      [
        499.31,
        500.38
      ],
      [
        499.06,
        500.38
      ],
      [
        227.94,
        771.63
      ],
      [
        227.56,
        771.63
      ],
      [
        227.56,
        500.13
      ],
      [
        227.19,
        500.13
      ],
      [
        227.19,
        364.13
      ],
      [
        236.81,
        364.13
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 680.18,
        "y": 590.54,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 318.14,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 498.84,
        "y": 454.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 679.93,
        "y": 454.73,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 327.41,
        "y": 319.01,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 295.19,
        "y": 432.15,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 704.78,
        "y": 366.18,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          499.16,
          500.03
        ],
        [
          634.6,
          500.03
        ]
      ],
      [
        [
          634.68,
          500.03
        ],
        [
          770.44,
          500.03
        ]
      ],
      [
        [
          363.08,
          500.03
        ],
        [
          499.16,
          500.03
        ]
      ],
      [
        [
          227.63,
          500.03
        ],
        [
          363.07,
          500.03
        ]
      ],
      [
        [
          636.77,
          366.31
        ],
        [
          770.44,
          499.98
        ]
      ],
      [
        [
          363.07,
          364.26
        ],
        [
          236.9,
          364.26
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
        548.44,
        246.69
      ],
      [
        820.19,
        246.69
      ],
      [
        820.19,
        247.06
      ],
      [
        548.81,
        518.44
      ],
      [
        548.44,
        518.44
      ],
      [
        548.44,
        368.31
      ],
      [
        548.06,
        368.56
      ],
      [
        548.06,
        560.81
      ],
      [
        547.69,
        561.06
      ],
      [
        547.69,
        561.31
      ],
      [
        739.44,
        752.94
      ],
      [
        739.44,
        753.31
      ],
      [
        547.19,
        753.31
      ],
      [
        451.56,
        657.56
      ],
      [
        451.44,
        734.19
      ],
      [
        179.81,
        734.19
      ],
      [
        179.81,
        733.81
      ],
      [
        451.06,
        462.69
      ],
      [
        451.06,
        462.44
      ],
      [
        356.69,
        368.06
      ],
      [
        356.44,
        368.06
      ],
      [
        350.19,
        374.44
      ],
      [
        349.81,
        374.44
      ],
      [
        253.94,
        278.56
      ],
      [
        253.94,
        278.19
      ],
      [
        446.06,
        278.19
      ],
      [
        452.44,
        271.69
      ],
      [
        452.81,
        271.69
      ],
      [
        548.44,
        367.31
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 639.12,
        "y": 337.32,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 360.83,
        "y": 643.57,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 611.34,
        "y": 689.2,
        "angle": 180,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 515.34,
        "y": 657.2,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 350.05,
        "y": 310.32,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 452.61,
        "y": 367.82,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.98,
        "y": 512.56,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          547.34,
          561.2
        ],
        [
          547.34,
          753.2
        ]
      ],
      [
        [
          451.98,
          656.56
        ],
        [
          547.34,
          561.2
        ]
      ],
      [
        [
          446.05,
          278.32
        ],
        [
          356.58,
          367.79
        ]
      ],
      [
        [
          547.93,
          368.51
        ],
        [
          452.61,
          463.82
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
        567.56,
        200.06
      ],
      [
        839.31,
        200.06
      ],
      [
        839.31,
        200.44
      ],
      [
        567.94,
        471.69
      ],
      [
        568.19,
        471.94
      ],
      [
        568.19,
        607.56
      ],
      [
        570.31,
        605.44
      ],
      [
        570.69,
        605.44
      ],
      [
        570.69,
        797.56
      ],
      [
        378.69,
        797.56
      ],
      [
        376.44,
        799.94
      ],
      [
        376.06,
        799.94
      ],
      [
        376.06,
        416.06
      ],
      [
        160.69,
        200.69
      ],
      [
        160.69,
        200.31
      ],
      [
        432.44,
        200.31
      ],
      [
        432.44,
        336.31
      ],
      [
        567.56,
        471.31
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 658.22,
        "y": 290.7,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 440.15,
        "y": 607.93,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 506.62,
        "y": 733.46,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 386.99,
        "y": 381.5,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 251.32,
        "y": 245.74,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.46,
        "y": 268.37,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500.2,
        "y": 472.09,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          568.15,
          607.93
        ],
        [
          378.62,
          797.46
        ]
      ],
      [
        [
          376.15,
          415.93
        ],
        [
          432.24,
          472.02
        ]
      ],
      [
        [
          432.31,
          472.09
        ],
        [
          568.08,
          607.86
        ]
      ],
      [
        [
          296.58,
          336.25
        ],
        [
          432.24,
          336.25
        ]
      ],
      [
        [
          432.24,
          336.33
        ],
        [
          432.24,
          472.01
        ]
      ],
      [
        [
          296.57,
          200.49
        ],
        [
          296.57,
          336.25
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 45,
    "chapter": 2,
    "name": "Z",
    "tip": "字母·七巧 · 七块板拼出大写 Z",
    "outline": [
      [
        432,
        228.31
      ],
      [
        568.13,
        228.31
      ],
      [
        568.13,
        228.81
      ],
      [
        839.75,
        228.81
      ],
      [
        839.75,
        229.19
      ],
      [
        568.38,
        500.56
      ],
      [
        568,
        500.56
      ],
      [
        567.88,
        500.19
      ],
      [
        432.5,
        635.69
      ],
      [
        567.63,
        635.69
      ],
      [
        567.63,
        629.81
      ],
      [
        703.63,
        629.81
      ],
      [
        703.63,
        630.19
      ],
      [
        567.88,
        765.81
      ],
      [
        567.88,
        771.69
      ],
      [
        431.88,
        771.69
      ],
      [
        431.88,
        765.44
      ],
      [
        160.25,
        765.44
      ],
      [
        160.25,
        765.06
      ],
      [
        431.63,
        493.69
      ],
      [
        432,
        493.69
      ],
      [
        432.13,
        499.81
      ],
      [
        567.5,
        364.44
      ],
      [
        296.38,
        364.31
      ],
      [
        296.38,
        363.94
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 658.65,
        "y": 319.48,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 341.39,
        "y": 674.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.2,
        "y": 318.98,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.05,
        "y": 675.16,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.77,
        "y": 273.69,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 499.85,
        "y": 703.65,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.97,
        "y": 500.01,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          568.14,
          364.2
        ],
        [
          568.14,
          228.97
        ]
      ],
      [
        [
          568.14,
          500.01
        ],
        [
          568.14,
          364.25
        ]
      ],
      [
        [
          431.9,
          635.77
        ],
        [
          431.9,
          765.26
        ]
      ],
      [
        [
          431.9,
          500.01
        ],
        [
          431.9,
          635.77
        ]
      ],
      [
        [
          432.21,
          228.48
        ],
        [
          567.96,
          364.23
        ]
      ],
      [
        [
          567.8,
          765.67
        ],
        [
          567.8,
          635.77
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  }
,
/* ==== ZODIAC_LEVELS_BEGIN ==== */
  /* v0.51：生肖十二关，由 tools/zodiac/ 从参考图反解得到（见 docs/v0.51-生肖关卡.md） */
  {"id":46,"chapter":3,"name":"鼠","tip":"生肖·七巧 · 尖嘴长尾 · 小老鼠","outline":[[178.34,181.53],[179.09,181.53],[274.34,277.03],[363.84,187.53],[364.59,187.53],[364.59,354.53],[556.59,546.03],[556.34,816.78],[691.59,681.53],[827.84,681.53],[827.84,682.28],[692.34,817.78],[556.34,817.78],[556.34,818.78],[284.34,818.78],[284.34,818.03],[363.84,738.53],[228.34,603.28],[228.34,602.53],[364.09,467.03],[364.09,380.53],[268.84,475.78],[267.84,475.78],[172.09,380.03],[172.09,379.28],[178.34,373.28]],"solution":[{"id":"T1","x":465.61,"y":727.96,"angle":315,"flipped":false},{"id":"S","x":268.34,"y":379.67,"angle":0,"flipped":false},{"id":"T2","x":428.41,"y":546.6,"angle":270,"flipped":false},{"id":"T3","x":319.12,"y":602.93,"angle":225,"flipped":true},{"id":"P","x":691.89,"y":749.69,"angle":135,"flipped":true},{"id":"T5","x":210.48,"y":277.53,"angle":270,"flipped":false},{"id":"T4","x":332.37,"y":283.69,"angle":90,"flipped":false}],"splitLines":[[[364.44,738.63],[556.12,546.94]],[[178.48,373.53],[268.34,283.67]],[[268.37,283.7],[364.34,379.67]],[[364.41,738.6],[364.41,467.17]],[[364.41,379.69],[364.41,354.6]],[[274.48,277.53],[268.35,283.66]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":47,"chapter":3,"name":"牛","tip":"生肖·七巧 · 双角低首 · 老黄牛","outline":[[108.8,240.12],[109.55,240.12],[244.8,375.62],[380.55,375.62],[515.8,240.12],[516.55,240.12],[516.55,376.12],[381.55,376.37],[483.8,478.62],[755.55,478.62],[891.3,614.37],[891.3,750.62],[890.55,750.62],[755.55,615.62],[755.55,750.62],[754.8,750.62],[708.3,703.87],[437.05,703.87],[381.05,760.12],[380.3,760.12],[380.3,511.87],[244.55,511.87],[244.55,376.12],[108.8,376.12]],"solution":[{"id":"T1","x":664.68,"y":569.47,"angle":225,"flipped":false},{"id":"S","x":312.7,"y":443.77,"angle":45,"flipped":false},{"id":"T2","x":444.58,"y":567.88,"angle":270,"flipped":false},{"id":"T3","x":572.58,"y":658.39,"angle":45,"flipped":false},{"id":"P","x":823.07,"y":614.73,"angle":45,"flipped":true},{"id":"T5","x":154.3,"y":330.63,"angle":45,"flipped":false},{"id":"T4","x":471.09,"y":330.63,"angle":315,"flipped":false}],"splitLines":[[[572.58,567.88],[483.66,478.96]],[[708.34,703.64],[572.58,567.88]],[[755.19,478.97],[755.19,614.73]],[[380.58,375.89],[380.58,511.65]],[[572.58,567.88],[436.82,703.64]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":48,"chapter":3,"name":"虎","tip":"生肖·七巧 · 昂首翘尾 · 猛虎","outline":[[304.84,267.98],[305.59,267.98],[423.34,385.98],[694.09,385.98],[622.84,314.73],[622.84,313.98],[759.09,313.98],[759.09,449.98],[830.84,521.48],[830.84,657.73],[830.09,657.73],[695.34,522.73],[695.09,657.98],[694.34,657.98],[576.59,539.98],[497.34,539.98],[305.59,731.98],[304.84,731.98],[304.84,602.23],[169.34,602.23],[169.34,601.48],[304.84,466.23],[304.84,408.48],[169.09,408.48],[169.09,272.23],[304.84,272.23]],"solution":[{"id":"T1","x":604.41,"y":476.84,"angle":225,"flipped":false},{"id":"S","x":237.28,"y":340.47,"angle":45,"flipped":false},{"id":"T2","x":395.67,"y":449.25,"angle":45,"flipped":false},{"id":"T3","x":369.15,"y":603.77,"angle":0,"flipped":false},{"id":"P","x":762.78,"y":521.93,"angle":45,"flipped":true},{"id":"T5","x":713.52,"y":359.54,"angle":225,"flipped":false},{"id":"T4","x":259.85,"y":556.76,"angle":315,"flipped":false}],"splitLines":[[[576.75,539.69],[423.39,386.33]],[[694.92,386.33],[694.92,521.93]],[[305.16,272.59],[305.16,408.35]],[[497.15,539.76],[305.16,539.76]],[[305.16,539.76],[305.16,466.25]],[[305.15,602.01],[305.15,539.77]],[[758.78,450.05],[694.9,386.17]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":49,"chapter":3,"name":"兔","tip":"生肖·七巧 · 长耳直立 · 小兔","outline":[[510.6,122.69],[646.85,122.69],[646.85,123.44],[511.35,258.94],[432.35,258.94],[432.35,333.94],[703.85,605.19],[703.85,877.19],[703.1,877.19],[699.6,873.44],[507.35,873.44],[411.6,777.69],[411.6,776.94],[507.35,681.19],[432.35,606.44],[432.35,697.69],[431.6,697.69],[335.85,601.94],[335.85,601.19],[431.85,505.44],[431.85,394.69],[296.1,394.69],[296.1,258.44],[375.1,258.44]],"solution":[{"id":"T1","x":613.14,"y":696.04,"angle":225,"flipped":false},{"id":"S","x":364.23,"y":326.59,"angle":45,"flipped":false},{"id":"T2","x":522.62,"y":515.02,"angle":45,"flipped":false},{"id":"T3","x":571.89,"y":809.3,"angle":180,"flipped":true},{"id":"P","x":510.87,"y":190.82,"angle":135,"flipped":true},{"id":"T5","x":400.11,"y":601.48,"angle":90,"flipped":false},{"id":"T4","x":475.89,"y":777.35,"angle":90,"flipped":false}],"splitLines":[[[432.12,605.53],[703.64,605.53]],[[699.89,873.3],[507.89,681.3]],[[432.11,334],[432.11,394.47]],[[375.11,258.71],[432.11,258.71]],[[432.11,605.53],[432.11,505.48]],[[507.89,681.35],[507.89,873.3]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":50,"chapter":3,"name":"龙","tip":"生肖·七巧 · 长身昂首 · 游龙","outline":[[809.91,287.97],[810.66,287.97],[945.91,423.47],[960.16,423.47],[960.16,424.22],[824.66,559.47],[900.41,635.22],[900.41,635.97],[516.66,635.97],[440.91,711.97],[440.16,711.97],[440.16,578.47],[304.41,578.47],[168.41,442.47],[32.91,442.47],[32.91,441.72],[168.16,306.47],[169.16,306.47],[304.41,441.97],[440.16,441.97],[440.16,440.22],[704.41,440.22],[688.41,424.22],[688.41,423.47],[809.91,423.47]],"solution":[{"id":"T1","x":708.53,"y":571.84,"angle":180,"flipped":false},{"id":"S","x":372.42,"y":510.22,"angle":45,"flipped":false},{"id":"T2","x":530.83,"y":531.02,"angle":135,"flipped":false},{"id":"T3","x":824.24,"y":469.03,"angle":135,"flipped":true},{"id":"P","x":236.56,"y":442.33,"angle":45,"flipped":true},{"id":"T4","x":855.32,"y":378.48,"angle":45,"flipped":false},{"id":"T5","x":123.42,"y":397.08,"angle":315,"flipped":true}],"splitLines":[[[516.53,635.84],[708.53,443.84]],[[708.53,443.84],[824.23,559.54]],[[440.3,442.34],[440.3,578.1]],[[304.54,578.09],[304.54,442.34]],[[945.83,423.78],[810.07,423.78]],[[168.68,306.57],[168.68,442.33]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":51,"chapter":3,"name":"蛇","tip":"生肖·七巧 · 盘曲蜿蜒 · 蛇","outline":[[35.48,307.75],[307.73,307.75],[489.48,489.75],[489.98,489.75],[671.73,307.75],[672.48,307.75],[960.23,595.5],[960.23,596.25],[767.73,596.25],[671.98,500.5],[480.48,692.25],[479.73,692.25],[287.98,500.5],[287.98,499.75],[306.98,499.75],[306.98,444],[35.48,444]],"solution":[{"id":"T1","x":672.01,"y":436,"angle":180,"flipped":false},{"id":"S","x":239.38,"y":375.88,"angle":45,"flipped":false},{"id":"T2","x":480.01,"y":564,"angle":0,"flipped":false},{"id":"T3","x":371.26,"y":436,"angle":180,"flipped":true},{"id":"P","x":816,"y":548,"angle":0,"flipped":true},{"id":"T5","x":126.24,"y":398.51,"angle":315,"flipped":false},{"id":"T4","x":80.98,"y":353.26,"angle":135,"flipped":false}],"splitLines":[[[672.01,500],[480.01,500]],[[499.26,500],[480.01,500]],[[864,500],[672,500]],[[307.26,308],[307.26,443.76]],[[171.5,443.76],[171.5,308]],[[307.26,500],[499.26,500]],[[35.73,443.76],[171.49,308.01]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":52,"chapter":3,"name":"马","tip":"生肖·七巧 · 昂首扬蹄 · 奔马","outline":[[692.83,272.58],[885.08,272.58],[885.08,464.83],[884.33,464.83],[793.33,373.58],[792.83,373.58],[697.58,469.08],[793.33,564.58],[793.33,565.33],[782.58,565.58],[917.58,700.33],[917.58,701.08],[781.33,701.08],[781.33,565.33],[409.08,565.33],[344.33,630.08],[344.33,727.33],[343.58,727.33],[247.83,631.58],[247.83,630.83],[343.83,535.08],[343.83,369.33],[218.83,494.33],[82.58,494.33],[82.58,493.58],[218.08,358.08],[615.58,358.08],[696.58,277.08],[692.83,273.33]],"solution":[{"id":"T1","x":601.05,"y":500.97,"angle":180,"flipped":false},{"id":"S","x":697.14,"y":373,"angle":0,"flipped":false},{"id":"T2","x":434.65,"y":448.82,"angle":135,"flipped":false},{"id":"T3","x":820.88,"y":336.83,"angle":0,"flipped":true},{"id":"P","x":218.34,"y":426.21,"angle":135,"flipped":true},{"id":"T5","x":312.05,"y":631.16,"angle":90,"flipped":false},{"id":"T4","x":826.91,"y":655.51,"angle":45,"flipped":false}],"splitLines":[[[601.11,373.03],[697.11,469.03]],[[409.05,564.97],[601.05,372.97]],[[601.14,373],[615.75,358.39]],[[697.14,277],[793.14,373]],[[344.14,358.31],[354.1,358.31]],[[344.14,629.84],[344.14,535.16]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":53,"chapter":3,"name":"羊","tip":"生肖·七巧 · 弯角侧立 · 山羊","outline":[[285.78,210.34],[422.03,210.34],[422.03,211.09],[322.28,310.84],[417.53,406.09],[418.03,406.09],[418.78,405.09],[419.53,405.09],[482.28,468.09],[753.53,468.09],[753.53,382.09],[754.28,382.09],[850.03,477.84],[850.03,478.59],[754.03,574.34],[754.03,740.09],[753.28,740.09],[611.03,597.59],[421.03,597.59],[229.53,789.34],[228.78,789.34],[228.78,597.59],[227.03,597.59],[227.03,596.84],[321.28,502.59],[226.03,407.34],[225.53,407.34],[150.78,482.34],[150.03,482.34],[150.03,346.09]],"solution":[{"id":"T1","x":419.13,"y":533.4,"angle":180,"flipped":false},{"id":"S","x":321.75,"y":406.73,"angle":0,"flipped":false},{"id":"T2","x":663.19,"y":558.89,"angle":225,"flipped":false},{"id":"T3","x":292.92,"y":661.42,"angle":0,"flipped":false},{"id":"P","x":286.14,"y":278.47,"angle":315,"flipped":true},{"id":"T5","x":195.53,"y":391.61,"angle":135,"flipped":false},{"id":"T4","x":785.72,"y":478.17,"angle":270,"flipped":false}],"splitLines":[[[321.77,502.76],[417.78,406.76]],[[482.14,468.41],[611.13,597.4]],[[420.92,597.4],[228.92,597.4]],[[286.13,346.35],[321.75,310.73]],[[225.75,406.73],[286.08,346.4]],[[753.7,468.38],[753.7,574.17]],[[150.38,346.35],[286.04,346.35]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":54,"chapter":3,"name":"猴","tip":"生肖·七巧 · 攀枝挠腮 · 猴","outline":[[407.01,147.09],[407.76,147.09],[501.01,240.34],[503.51,242.84],[503.51,243.34],[504.01,243.34],[775.26,514.59],[775.26,515.34],[639.76,650.84],[503.51,650.84],[437.51,716.84],[437.51,852.84],[301.26,852.84],[301.26,852.09],[367.51,786.09],[367.51,514.59],[503.26,514.59],[503.26,435.59],[311.51,435.59],[225.51,521.84],[224.76,521.84],[224.76,385.84],[360.76,385.84],[407.01,339.59],[311.26,243.84],[311.26,242.84]],"solution":[{"id":"T1","x":458.21,"y":605.37,"angle":135,"flipped":false},{"id":"S","x":407.47,"y":243.34,"angle":0,"flipped":false},{"id":"T2","x":593.98,"y":424.35,"angle":45,"flipped":false},{"id":"T3","x":439.54,"y":371.37,"angle":90,"flipped":true},{"id":"P","x":639.23,"y":582.75,"angle":135,"flipped":true},{"id":"T5","x":270.26,"y":431.29,"angle":135,"flipped":false},{"id":"T4","x":391.94,"y":807.41,"angle":315,"flipped":false}],"splitLines":[[[503.47,514.86],[639.23,514.86]],[[639.23,514.86],[503.46,650.63]],[[437.19,716.9],[367.7,786.39]],[[503.47,243.34],[407.47,339.34]],[[503.47,435.37],[503.47,243.37]],[[774.99,514.86],[639.23,514.86]],[[360.82,386.09],[311.54,435.37]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":55,"chapter":3,"name":"鸡","tip":"生肖·七巧 · 高冠翘尾 · 公鸡","outline":[[652.41,189.61],[653.16,189.61],[787.91,324.61],[788.91,324.36],[788.91,516.86],[693.16,612.61],[692.41,612.61],[692.16,421.36],[516.41,597.36],[515.91,597.36],[515.91,723.86],[525.91,713.86],[526.66,713.86],[622.41,809.61],[622.41,810.36],[430.16,810.36],[430.16,809.61],[515.16,724.86],[515.16,724.36],[244.16,453.61],[244.16,452.86],[259.91,452.86],[259.91,317.36],[211.41,317.36],[211.41,316.61],[306.91,221.11],[307.91,221.11],[403.41,316.61],[403.41,317.36],[396.16,317.36],[396.16,452.86],[515.66,452.86],[515.66,325.36],[516.91,325.36]],"solution":[{"id":"T1","x":425.26,"y":543.58,"angle":225,"flipped":false},{"id":"S","x":328.14,"y":385.08,"angle":135,"flipped":false},{"id":"T2","x":606.35,"y":416.17,"angle":135,"flipped":false},{"id":"T3","x":652.82,"y":280.37,"angle":45,"flipped":false},{"id":"P","x":740.55,"y":468.55,"angle":90,"flipped":true},{"id":"T5","x":307.41,"y":285.18,"angle":180,"flipped":false},{"id":"T4","x":526.25,"y":778.14,"angle":180,"flipped":false}],"splitLines":[[[260.26,453.07],[396.02,453.07]],[[515.77,453.07],[515.77,597.19]],[[260.26,317.2],[396.02,317.2]],[[517.06,325.66],[787.37,325.66]],[[787.37,325.66],[692.51,420.51]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":56,"chapter":3,"name":"狗","tip":"生肖·七巧 · 伏身竖耳 · 狗","outline":[[148.1,223.93],[148.85,223.93],[284.35,359.43],[284.35,495.18],[540.35,495.18],[666.35,369.18],[659.6,368.93],[659.6,368.18],[755.1,272.68],[756.1,272.68],[851.6,368.18],[851.6,368.93],[803.35,368.93],[803.35,776.18],[802.6,776.18],[667.1,640.43],[395.85,640.43],[269.35,767.18],[268.6,767.18],[268.6,495.18],[283.1,494.93],[148.1,360.18]],"solution":[{"id":"T1","x":359.47,"y":585.96,"angle":135,"flipped":false},{"id":"S","x":735.12,"y":436.65,"angle":45,"flipped":false},{"id":"T2","x":576.7,"y":549.78,"angle":315,"flipped":false},{"id":"T3","x":757.77,"y":640.31,"angle":225,"flipped":true},{"id":"P","x":216.23,"y":359.69,"angle":45,"flipped":true},{"id":"T5","x":755.65,"y":336.77,"angle":180,"flipped":false},{"id":"T4","x":712.51,"y":549.79,"angle":135,"flipped":false}],"splitLines":[[[540.49,495.45],[395.67,640.27]],[[667.24,504.53],[667.24,368.77]],[[667.24,368.77],[803,368.77]],[[803,504.53],[667.26,504.53]],[[667.21,504.54],[667.21,640.29]],[[803.02,504.55],[667.26,640.31]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
  {"id":57,"chapter":3,"name":"猪","tip":"生肖·七巧 · 圆身短腿 · 猪","outline":[[363.83,291.72],[364.58,291.72],[364.58,379.72],[636.08,379.72],[636.08,380.22],[771.83,380.22],[907.33,515.72],[907.33,516.47],[884.08,516.47],[884.08,708.47],[883.33,708.47],[787.58,612.47],[595.33,612.47],[499.83,516.72],[364.83,651.72],[364.08,651.72],[364.08,563.47],[92.83,563.47],[92.83,562.72]],"solution":[{"id":"T1","x":273.85,"y":472.74,"angle":315,"flipped":false},{"id":"S","x":703.46,"y":448.3,"angle":45,"flipped":false},{"id":"T2","x":454.87,"y":470.47,"angle":135,"flipped":false},{"id":"T3","x":819.88,"y":580.28,"angle":0,"flipped":true},{"id":"P","x":643.73,"y":564.15,"angle":0,"flipped":true},{"id":"T5","x":816.65,"y":471.02,"angle":45,"flipped":false},{"id":"T4","x":590.27,"y":470.89,"angle":315,"flipped":false}],"splitLines":[[[364.36,379.96],[364.36,563.25]],[[771.34,516.18],[691.88,516.18]],[[691.73,516.18],[635.58,516.18]],[[771.34,380.51],[771.34,516.18]],[[635.58,516.14],[635.58,380.42]],[[635.5,380.35],[499.73,516.12]],[[691.88,516.28],[787.74,612.14]],[[883.88,516.28],[771.4,516.28]],[[635.52,516.15],[499.76,516.15]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true}
/* ==== ZODIAC_LEVELS_END ==== */];
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
      chapNames: ["几何·入门","字母·A–Z","生肖·十二"], chapTitles: ["几何","字母","生肖"],
      /* v0.50：数据集自带章节表（from 从 1 计，count 关数）。
       * 用户反馈「字母关卡不要分出来，统一放在字母关下，多出的图案做滚动」——
       * 26 个字母合成一章，关卡页 4 列排 7 行，超出视口可上下拖动。 */
      chapters: [
        { name: '几何·入门', title: '几何', from: 1, count: 19 },
        { name: '字母·A–Z', title: '字母', from: 20, count: 26 },
        { name: '生肖·十二', title: '生肖', from: 46, count: 12 }
      ],
      completeTitle: '七巧板全部完成', completeSub: '全部 57 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
