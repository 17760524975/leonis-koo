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
        432,
        228.38
      ],
      [
        568.13,
        228.38
      ],
      [
        703.75,
        364
      ],
      [
        703.75,
        748.38
      ],
      [
        567.75,
        748.38
      ],
      [
        567.75,
        612.5
      ],
      [
        511.88,
        556.63
      ],
      [
        511.5,
        556.63
      ],
      [
        296.63,
        771.63
      ],
      [
        296.25,
        771.63
      ],
      [
        296.25,
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
          567.9,
          500.03
        ],
        [
          567.9,
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
        "x": 386.88,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 639.67,
        "y": 556.27,
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
        "x": 613.16,
        "y": 409.52,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.16,
        "y": 703.01,
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
          567.9,
          500.03
        ],
        [
          511.66,
          556.26
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
          703.67,
          748.27
        ],
        [
          567.9,
          612.5
        ]
      ],
      [
        [
          703.66,
          364.26
        ],
        [
          567.91,
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
        296.25,
        228.38
      ],
      [
        568.13,
        228.38
      ],
      [
        703.75,
        364
      ],
      [
        703.75,
        364.5
      ],
      [
        568.75,
        499.38
      ],
      [
        568.88,
        499.88
      ],
      [
        680.5,
        499.88
      ],
      [
        680.5,
        692.13
      ],
      [
        680.13,
        692.13
      ],
      [
        664.13,
        676
      ],
      [
        663.63,
        676
      ],
      [
        568.13,
        771.63
      ],
      [
        296.25,
        771.63
      ]
    ],
    "holes": [
      [
        [
          567.9,
          364.26
        ],
        [
          567.9,
          228.5
        ],
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
          392.38,
          596.03
        ],
        [
          471.9,
          675.56
        ],
        [
          567.9,
          579.56
        ],
        [
          488.37,
          500.03
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.89,
        "y": 681.05,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.88,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 616.37,
        "y": 564.03,
        "angle": 0,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 392.38,
        "y": 532.03,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.16,
        "y": 319.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 567.9,
        "y": 675.56,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 567.9,
        "y": 432.15,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          296.38,
          500.03
        ],
        [
          392.38,
          596.03
        ]
      ],
      [
        [
          471.9,
          675.56
        ],
        [
          567.9,
          771.56
        ]
      ],
      [
        [
          567.9,
          579.56
        ],
        [
          663.9,
          675.56
        ]
      ],
      [
        [
          567.9,
          500.03
        ],
        [
          488.37,
          500.03
        ]
      ],
      [
        [
          432.14,
          500.03
        ],
        [
          488.38,
          500.03
        ]
      ],
      [
        [
          703.66,
          364.26
        ],
        [
          567.91,
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
    "id": 22,
    "chapter": 2,
    "name": "C",
    "tip": "字母·七巧 · 七块板拼出大写 C",
    "outline": [
      [
        480,
        200.25
      ],
      [
        616.13,
        200.25
      ],
      [
        712,
        296.13
      ],
      [
        712,
        296.63
      ],
      [
        616.13,
        392.5
      ],
      [
        615.75,
        392.5
      ],
      [
        615.63,
        336.25
      ],
      [
        480.25,
        336.38
      ],
      [
        480.25,
        584.38
      ],
      [
        559.38,
        663.5
      ],
      [
        559.88,
        663.5
      ],
      [
        695.13,
        528.13
      ],
      [
        695.5,
        528.13
      ],
      [
        695.5,
        664.13
      ],
      [
        559.88,
        799.75
      ],
      [
        423.63,
        799.75
      ],
      [
        288,
        664.13
      ],
      [
        288,
        392.38
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 378.63,
        "y": 573.39,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 416.13,
        "y": 392.38,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 423.89,
        "y": 709.16,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 650.16,
        "y": 618.65,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 647.89,
        "y": 296.38,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 548.01,
        "y": 268.26,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 559.65,
        "y": 731.79,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          288.13,
          392.38
        ],
        [
          480.13,
          584.38
        ]
      ],
      [
        [
          559.65,
          663.9
        ],
        [
          288.13,
          663.9
        ]
      ],
      [
        [
          480.13,
          200.38
        ],
        [
          480.13,
          336.14
        ]
      ],
      [
        [
          423.89,
          799.67
        ],
        [
          559.65,
          663.91
        ]
      ],
      [
        [
          695.41,
          663.9
        ],
        [
          559.65,
          663.9
        ]
      ],
      [
        [
          615.89,
          336.14
        ],
        [
          615.89,
          200.38
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
        296.25,
        228.38
      ],
      [
        568.13,
        228.38
      ],
      [
        703.75,
        364
      ],
      [
        703.75,
        636
      ],
      [
        568.13,
        771.63
      ],
      [
        296.25,
        771.63
      ]
    ],
    "holes": [
      [
        [
          296.38,
          500.03
        ],
        [
          432.14,
          635.79
        ],
        [
          567.9,
          635.79
        ],
        [
          567.9,
          500.03
        ],
        [
          567.9,
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
        "x": 386.89,
        "y": 681.05,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.88,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.9,
        "y": 681.05,
        "angle": 135,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 613.16,
        "y": 454.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.65,
        "y": 319.01,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 635.79,
        "y": 567.91,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.79,
        "y": 364.26,
        "angle": 225,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          432.14,
          635.79
        ],
        [
          567.9,
          771.56
        ]
      ],
      [
        [
          567.9,
          228.5
        ],
        [
          432.14,
          364.26
        ]
      ],
      [
        [
          703.66,
          635.8
        ],
        [
          567.91,
          635.8
        ]
      ],
      [
        [
          703.67,
          500.02
        ],
        [
          567.91,
          500.02
        ]
      ],
      [
        [
          567.91,
          364.26
        ],
        [
          703.67,
          500.02
        ]
      ],
      [
        [
          567.9,
          228.5
        ],
        [
          567.9,
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
    "id": 24,
    "chapter": 2,
    "name": "E",
    "tip": "字母·七巧 · 七块板拼出大写 E",
    "outline": [
      [
        296.25,
        228.38
      ],
      [
        703.75,
        228.38
      ],
      [
        703.75,
        228.75
      ],
      [
        568.13,
        364.38
      ],
      [
        432.25,
        364.5
      ],
      [
        432.38,
        428.25
      ],
      [
        568,
        428.25
      ],
      [
        568,
        564.25
      ],
      [
        432.38,
        564.25
      ],
      [
        432.25,
        635.5
      ],
      [
        568,
        635.63
      ],
      [
        703.63,
        771.25
      ],
      [
        703.63,
        771.63
      ],
      [
        296.25,
        771.63
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 386.88,
        "y": 681.05,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.89,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 386.88,
        "y": 500.03,
        "angle": 225,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 522.65,
        "y": 319.01,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.16,
        "y": 273.76,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 499.95,
        "y": 496.24,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 567.9,
        "y": 703.67,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          296.37,
          500.03
        ],
        [
          432.13,
          635.79
        ]
      ],
      [
        [
          432.13,
          635.79
        ],
        [
          567.9,
          771.56
        ]
      ],
      [
        [
          432.14,
          364.27
        ],
        [
          296.38,
          500.03
        ]
      ],
      [
        [
          567.91,
          228.5
        ],
        [
          432.14,
          364.27
        ]
      ],
      [
        [
          432.13,
          564.12
        ],
        [
          432.13,
          428.36
        ]
      ],
      [
        [
          567.9,
          228.51
        ],
        [
          567.9,
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
    "id": 25,
    "chapter": 2,
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出大写 F",
    "outline": [
      [
        296.25,
        200.25
      ],
      [
        703.75,
        200.25
      ],
      [
        703.75,
        336.25
      ],
      [
        432.25,
        336.38
      ],
      [
        432.38,
        471.75
      ],
      [
        680.5,
        471.75
      ],
      [
        680.5,
        472.13
      ],
      [
        488.63,
        664
      ],
      [
        432.25,
        664.13
      ],
      [
        432.25,
        799.75
      ],
      [
        296.25,
        799.75
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 488.38,
        "y": 535.9,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.89,
        "y": 290.88,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 360.38,
        "y": 599.9,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.89,
        "y": 426.65,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 658.41,
        "y": 290.88,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.26,
        "y": 731.79,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 567.9,
        "y": 268.26,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          488.38,
          663.9
        ],
        [
          296.38,
          471.9
        ]
      ],
      [
        [
          296.38,
          471.9
        ],
        [
          432.14,
          471.9
        ]
      ],
      [
        [
          432.14,
          336.14
        ],
        [
          296.38,
          471.9
        ]
      ],
      [
        [
          567.9,
          200.38
        ],
        [
          432.14,
          336.14
        ]
      ],
      [
        [
          432.14,
          663.9
        ],
        [
          296.38,
          663.9
        ]
      ],
      [
        [
          567.9,
          336.13
        ],
        [
          703.66,
          200.37
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
        567.75,
        663.5
      ],
      [
        568.13,
        663.5
      ],
      [
        607.25,
        624.38
      ],
      [
        607.25,
        623.88
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
        "x": 386.89,
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
        296.25,
        228.38
      ],
      [
        432.25,
        228.38
      ],
      [
        432.38,
        364.13
      ],
      [
        567.75,
        364
      ],
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
        771.63
      ],
      [
        703.38,
        771.63
      ],
      [
        567.75,
        636
      ],
      [
        567.63,
        500.13
      ],
      [
        488.5,
        500.13
      ],
      [
        432.25,
        556.38
      ],
      [
        432.25,
        692.13
      ],
      [
        296.25,
        692.13
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 386.89,
        "y": 409.52,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 613.16,
        "y": 454.78,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 360.38,
        "y": 564.03,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.88,
        "y": 646.77,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.89,
        "y": 273.76,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 635.79,
        "y": 296.38,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.79,
        "y": 635.79,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          432.15,
          364.27
        ],
        [
          567.91,
          500.03
        ]
      ],
      [
        [
          488.38,
          500.03
        ],
        [
          296.38,
          500.03
        ]
      ],
      [
        [
          296.38,
          228.5
        ],
        [
          432.15,
          364.27
        ]
      ],
      [
        [
          567.91,
          364.27
        ],
        [
          703.67,
          364.27
        ]
      ],
      [
        [
          703.67,
          635.8
        ],
        [
          567.9,
          500.03
        ]
      ],
      [
        [
          432.14,
          556.27
        ],
        [
          296.38,
          692.03
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
        327.81,
        192
      ],
      [
        711.94,
        192
      ],
      [
        711.94,
        192.38
      ],
      [
        615.94,
        288.25
      ],
      [
        615.94,
        671.88
      ],
      [
        695.44,
        672
      ],
      [
        695.44,
        808
      ],
      [
        288.06,
        808
      ],
      [
        288.06,
        807.63
      ],
      [
        423.69,
        672.13
      ],
      [
        423.69,
        288.13
      ],
      [
        327.81,
        192.38
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 519.83,
        "y": 256.13,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 487.83,
        "y": 480.12,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 551.83,
        "y": 608.12,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 583.83,
        "y": 384.12,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 514.34,
        "y": 762.63,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 627.47,
        "y": 740.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 423.83,
        "y": 740.01,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          519.83,
          384.13
        ],
        [
          423.83,
          288.12
        ]
      ],
      [
        [
          615.84,
          288.13
        ],
        [
          519.84,
          384.13
        ]
      ],
      [
        [
          615.83,
          480.12
        ],
        [
          423.83,
          672.12
        ]
      ],
      [
        [
          519.83,
          384.12
        ],
        [
          615.83,
          480.12
        ]
      ],
      [
        [
          559.59,
          672.12
        ],
        [
          615.83,
          672.12
        ]
      ],
      [
        [
          423.83,
          672.12
        ],
        [
          559.59,
          672.12
        ]
      ],
      [
        [
          559.59,
          672.13
        ],
        [
          559.59,
          807.88
        ]
      ],
      [
        [
          423.83,
          807.88
        ],
        [
          559.59,
          672.12
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
        163.94
      ],
      [
        740.13,
        163.94
      ],
      [
        740.13,
        164.31
      ],
      [
        644.13,
        260.19
      ],
      [
        644.13,
        644.19
      ],
      [
        452.25,
        836.06
      ],
      [
        451.75,
        836.06
      ],
      [
        259.88,
        644.19
      ],
      [
        259.88,
        643.81
      ],
      [
        355.75,
        547.94
      ],
      [
        356.25,
        547.94
      ],
      [
        451.38,
        643.19
      ],
      [
        451.88,
        643.06
      ],
      [
        451.88,
        260.06
      ],
      [
        356,
        164.31
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 228.06,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 516,
        "y": 452.06,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 580,
        "y": 580.06,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 612,
        "y": 356.06,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 452,
        "y": 772.06,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 356,
        "y": 644.06,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 692.06,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          548,
          356.06
        ],
        [
          452,
          260.06
        ]
      ],
      [
        [
          644,
          260.06
        ],
        [
          548,
          356.06
        ]
      ],
      [
        [
          644,
          452.06
        ],
        [
          452,
          644.06
        ]
      ],
      [
        [
          548,
          356.06
        ],
        [
          644,
          452.06
        ]
      ],
      [
        [
          452,
          644.06
        ],
        [
          644,
          644.06
        ]
      ],
      [
        [
          356,
          740.06
        ],
        [
          548,
          740.06
        ]
      ],
      [
        [
          452,
          644.06
        ],
        [
          356,
          740.06
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
        556.19,
        192
      ],
      [
        556.56,
        192
      ],
      [
        652.44,
        287.88
      ],
      [
        652.44,
        288.38
      ],
      [
        460.69,
        480
      ],
      [
        460.69,
        480.38
      ],
      [
        731.81,
        751.38
      ],
      [
        731.81,
        751.75
      ],
      [
        595.81,
        751.75
      ],
      [
        460.56,
        616.38
      ],
      [
        460.06,
        616.38
      ],
      [
        268.56,
        808
      ],
      [
        268.19,
        808
      ],
      [
        268.19,
        231.75
      ],
      [
        460.44,
        231.75
      ],
      [
        460.44,
        287.25
      ],
      [
        460.94,
        287.38
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 396.31,
        "y": 423.89,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 332.31,
        "y": 615.89,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 332.31,
        "y": 295.89,
        "angle": 270,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 505.57,
        "y": 570.64,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 492.31,
        "y": 384.13,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "S",
        "x": 556.31,
        "y": 288.13,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596.08,
        "y": 683.77,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          460.31,
          615.89
        ],
        [
          268.31,
          423.89
        ]
      ],
      [
        [
          268.31,
          423.89
        ],
        [
          460.31,
          231.89
        ]
      ],
      [
        [
          460.31,
          480.13
        ],
        [
          460.31,
          615.89
        ]
      ],
      [
        [
          460.31,
          288.13
        ],
        [
          460.31,
          480.13
        ]
      ],
      [
        [
          596.08,
          615.89
        ],
        [
          460.32,
          615.89
        ]
      ],
      [
        [
          460.31,
          288.13
        ],
        [
          556.31,
          384.13
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
        268.13,
        211.88
      ],
      [
        460.38,
        211.88
      ],
      [
        460.38,
        595.88
      ],
      [
        556,
        691.5
      ],
      [
        556.5,
        691.5
      ],
      [
        595.75,
        652.13
      ],
      [
        731.88,
        652.13
      ],
      [
        731.88,
        788.13
      ],
      [
        268.13,
        788.13
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 396.25,
        "y": 404,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 332.25,
        "y": 596,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 332.25,
        "y": 276,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 364.25,
        "y": 756,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 686.52,
        "y": 742.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 460.25,
        "y": 692,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596.01,
        "y": 720.12,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          460.25,
          596
        ],
        [
          268.25,
          404
        ]
      ],
      [
        [
          268.25,
          404
        ],
        [
          460.25,
          212
        ]
      ],
      [
        [
          364.25,
          692
        ],
        [
          268.25,
          788
        ]
      ],
      [
        [
          460.25,
          596
        ],
        [
          364.25,
          692
        ]
      ],
      [
        [
          364.25,
          692
        ],
        [
          460.25,
          788
        ]
      ],
      [
        [
          596.01,
          788
        ],
        [
          731.77,
          652.24
        ]
      ],
      [
        [
          556.25,
          692
        ],
        [
          460.25,
          788
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
        689.5,
        220.13
      ],
      [
        689.88,
        220.13
      ],
      [
        689.88,
        604.25
      ],
      [
        729.63,
        643.88
      ],
      [
        729.63,
        779.88
      ],
      [
        593.63,
        779.88
      ],
      [
        593.5,
        509
      ],
      [
        593.13,
        509
      ],
      [
        497.88,
        604.38
      ],
      [
        497.5,
        604.38
      ],
      [
        406.88,
        513.63
      ],
      [
        406.5,
        513.63
      ],
      [
        406.38,
        775.38
      ],
      [
        270.38,
        775.38
      ],
      [
        270.38,
        639.25
      ],
      [
        305.63,
        604.13
      ],
      [
        305.63,
        220.25
      ],
      [
        306,
        220.25
      ],
      [
        497.5,
        411.88
      ],
      [
        497.88,
        411.88
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 625.74,
        "y": 412.25,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 369.74,
        "y": 412.25,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 361.01,
        "y": 639.49,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 315.76,
        "y": 730,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 638.99,
        "y": 734.52,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 497.74,
        "y": 508.25,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 661.62,
        "y": 644.01,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          593.74,
          508.25
        ],
        [
          497.74,
          412.25
        ]
      ],
      [
        [
          689.74,
          604.25
        ],
        [
          593.74,
          508.25
        ]
      ],
      [
        [
          406.26,
          503.73
        ],
        [
          305.74,
          604.25
        ]
      ],
      [
        [
          497.74,
          412.25
        ],
        [
          401.74,
          508.25
        ]
      ],
      [
        [
          406.26,
          775.25
        ],
        [
          270.5,
          639.49
        ]
      ],
      [
        [
          593.74,
          644.01
        ],
        [
          729.5,
          779.77
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
        511.88,
        556.63
      ],
      [
        511.5,
        556.63
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
        567.25,
        499.25
      ],
      [
        567.63,
        499.25
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 639.67,
        "y": 556.26,
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
        "y": 273.75,
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
          500.02
        ],
        [
          703.67,
          364.26
        ]
      ],
      [
        [
          511.67,
          556.26
        ],
        [
          567.9,
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
        220.13
      ],
      [
        683.88,
        220.13
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
        316.13
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
        296.25,
        228.37
      ],
      [
        568.13,
        228.37
      ],
      [
        703.75,
        364
      ],
      [
        703.75,
        500.25
      ],
      [
        568.13,
        635.88
      ],
      [
        432.38,
        635.88
      ],
      [
        432.25,
        771.63
      ],
      [
        296.25,
        771.63
      ]
    ],
    "holes": [
      [
        [
          567.9,
          364.26
        ],
        [
          432.14,
          364.26
        ],
        [
          432.14,
          500.03
        ],
        [
          567.9,
          500.03
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.88,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.88,
        "y": 590.54,
        "angle": 135,
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
        "x": 386.88,
        "y": 726.3,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.88,
        "y": 454.77,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 635.79,
        "y": 432.15,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 567.9,
        "y": 567.91,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          567.9,
          228.5
        ],
        [
          432.14,
          364.26
        ]
      ],
      [
        [
          432.14,
          364.26
        ],
        [
          296.37,
          500.03
        ]
      ],
      [
        [
          432.14,
          635.79
        ],
        [
          296.37,
          771.56
        ]
      ],
      [
        [
          296.37,
          500.03
        ],
        [
          432.13,
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
          635.79
        ]
      ],
      [
        [
          703.66,
          364.26
        ],
        [
          567.91,
          364.26
        ]
      ],
      [
        [
          703.66,
          500.03
        ],
        [
          567.91,
          500.03
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
        451.88,
        211.87
      ],
      [
        452.25,
        211.87
      ],
      [
        644.13,
        403.75
      ],
      [
        644.13,
        596
      ],
      [
        740.13,
        691.88
      ],
      [
        740.13,
        692.25
      ],
      [
        644.25,
        788.13
      ],
      [
        643.75,
        788.13
      ],
      [
        548.25,
        692.5
      ],
      [
        547.75,
        692.5
      ],
      [
        452.25,
        788.13
      ],
      [
        451.75,
        788.13
      ],
      [
        259.88,
        596.25
      ],
      [
        259.88,
        403.87
      ]
    ],
    "holes": [
      [
        [
          548,
          500
        ],
        [
          452,
          404
        ],
        [
          452,
          596
        ],
        [
          548,
          692
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 452,
        "y": 340,
        "angle": 180,
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
        "x": 324,
        "y": 468,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 484,
        "y": 692,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 548,
        "y": 436,
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
        "id": "P",
        "x": 596,
        "y": 548,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          452,
          404
        ],
        [
          260,
          404
        ]
      ],
      [
        [
          644,
          404
        ],
        [
          452,
          404
        ]
      ],
      [
        [
          260,
          596
        ],
        [
          452,
          404
        ]
      ],
      [
        [
          452,
          596
        ],
        [
          452,
          788
        ]
      ],
      [
        [
          644,
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
          692
        ],
        [
          644,
          596
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
        296.25,
        228.38
      ],
      [
        568.13,
        228.38
      ],
      [
        703.75,
        364
      ],
      [
        703.75,
        500.13
      ],
      [
        568.75,
        500.25
      ],
      [
        568.75,
        500.63
      ],
      [
        703.75,
        635.5
      ],
      [
        703.75,
        771.63
      ],
      [
        703.38,
        771.63
      ],
      [
        567.75,
        636
      ],
      [
        567.63,
        500.88
      ],
      [
        567.25,
        500.88
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
      ]
    ],
    "holes": [
      [
        [
          432.14,
          500.03
        ],
        [
          567.9,
          500.03
        ],
        [
          567.9,
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
        "x": 386.89,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.89,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.91,
        "y": 319.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 386.89,
        "y": 454.77,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.88,
        "y": 726.3,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 635.79,
        "y": 432.15,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.79,
        "y": 635.79,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
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
          432.14,
          635.8
        ],
        [
          296.38,
          771.56
        ]
      ],
      [
        [
          567.91,
          228.5
        ],
        [
          432.15,
          364.26
        ]
      ],
      [
        [
          432.15,
          364.26
        ],
        [
          296.38,
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
        319.87
      ],
      [
        432.38,
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
        567.75,
        680.13
      ],
      [
        567.63,
        568
      ],
      [
        432,
        568
      ],
      [
        240,
        376.12
      ],
      [
        240,
        375.62
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
        "y": 375.87,
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
        "x": 522.63,
        "y": 725.6,
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
        "y": 748.23,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.89,
          816.11
        ],
        [
          567.89,
          680.35
        ]
      ],
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
          567.88,
          816.11
        ],
        [
          432.12,
          680.35
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
        200.25,
        200.25
      ],
      [
        799.75,
        200.25
      ],
      [
        799.75,
        200.63
      ],
      [
        607.75,
        392.5
      ],
      [
        607.75,
        607.88
      ],
      [
        415.87,
        799.75
      ],
      [
        415.5,
        799.75
      ],
      [
        415.5,
        415.75
      ],
      [
        336,
        336.25
      ],
      [
        200.25,
        336.25
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 479.67,
        "y": 607.67,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 381.39,
        "y": 290.89,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 671.67,
        "y": 264.38,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 562.41,
        "y": 381.4,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 245.63,
        "y": 290.89,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 539.79,
        "y": 268.26,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 539.79,
        "y": 471.91,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          415.67,
          415.67
        ],
        [
          471.9,
          471.9
        ]
      ],
      [
        [
          471.91,
          471.91
        ],
        [
          607.67,
          607.67
        ]
      ],
      [
        [
          336.14,
          336.15
        ],
        [
          200.37,
          200.38
        ]
      ],
      [
        [
          471.9,
          200.38
        ],
        [
          471.9,
          336.14
        ]
      ],
      [
        [
          471.9,
          336.15
        ],
        [
          471.9,
          471.91
        ]
      ],
      [
        [
          607.67,
          392.38
        ],
        [
          607.67,
          336.15
        ]
      ],
      [
        [
          607.67,
          336.14
        ],
        [
          607.67,
          200.38
        ]
      ],
      [
        [
          471.91,
          336.15
        ],
        [
          607.66,
          336.15
        ]
      ],
      [
        [
          607.66,
          471.91
        ],
        [
          471.9,
          336.15
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
        324.38,
        240
      ],
      [
        460.38,
        240
      ],
      [
        460.5,
        624
      ],
      [
        595.88,
        623.88
      ],
      [
        595.88,
        488.38
      ],
      [
        539.75,
        432.38
      ],
      [
        539.75,
        431.88
      ],
      [
        595.88,
        375.88
      ],
      [
        595.88,
        240
      ],
      [
        731.88,
        240
      ],
      [
        731.88,
        624.38
      ],
      [
        596.25,
        760
      ],
      [
        460,
        760
      ],
      [
        324.38,
        624.38
      ],
      [
        324.38,
        488.5
      ],
      [
        268.13,
        432.38
      ],
      [
        268.13,
        432
      ],
      [
        324.38,
        375.88
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 667.78,
        "y": 432.13,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 396.25,
        "y": 432.13,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 641.27,
        "y": 624.13,
        "angle": 45,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 641.26,
        "y": 285.38,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 369.74,
        "y": 285.38,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 528.13,
        "y": 692.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 392.37,
        "y": 624.12,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          731.78,
          624.13
        ],
        [
          596.02,
          488.37
        ]
      ],
      [
        [
          596.01,
          375.9
        ],
        [
          731.78,
          240.13
        ]
      ],
      [
        [
          324.49,
          375.89
        ],
        [
          460.25,
          240.13
        ]
      ],
      [
        [
          460.25,
          624.13
        ],
        [
          324.48,
          488.36
        ]
      ],
      [
        [
          596.02,
          624.13
        ],
        [
          596.02,
          759.89
        ]
      ],
      [
        [
          460.25,
          759.88
        ],
        [
          460.25,
          624.13
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
        296.25,
        228.37
      ],
      [
        432.25,
        228.37
      ],
      [
        432.38,
        499.25
      ],
      [
        432.75,
        499.25
      ],
      [
        567.75,
        364.25
      ],
      [
        567.75,
        228.37
      ],
      [
        703.75,
        228.37
      ],
      [
        703.75,
        500.25
      ],
      [
        432.38,
        771.63
      ],
      [
        431.88,
        771.63
      ],
      [
        296.25,
        636
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 613.16,
        "y": 409.52,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 522.65,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 386.88,
        "y": 635.79,
        "angle": 225,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 341.63,
        "y": 409.52,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 613.16,
        "y": 273.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.26,
        "y": 296.38,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 364.26,
        "y": 500.03,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          703.67,
          500.03
        ],
        [
          432.14,
          500.03
        ]
      ],
      [
        [
          567.91,
          364.26
        ],
        [
          703.67,
          228.5
        ]
      ],
      [
        [
          432.14,
          771.55
        ],
        [
          432.14,
          500.03
        ]
      ],
      [
        [
          432.13,
          500.03
        ],
        [
          296.37,
          635.79
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
      ],
      [
        [
          432.14,
          364.27
        ],
        [
          296.38,
          500.03
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
        635.63,
        228.38
      ],
      [
        636,
        228.38
      ],
      [
        771.63,
        364
      ],
      [
        771.63,
        771.63
      ],
      [
        771.25,
        771.63
      ],
      [
        500.25,
        500.5
      ],
      [
        499.75,
        500.5
      ],
      [
        228.75,
        771.63
      ],
      [
        228.38,
        771.63
      ],
      [
        228.38,
        364.13
      ],
      [
        364,
        228.5
      ],
      [
        364.38,
        228.5
      ],
      [
        364.5,
        499.25
      ],
      [
        364.88,
        499.25
      ],
      [
        499.88,
        364.13
      ],
      [
        500.25,
        364.13
      ],
      [
        635.13,
        499.13
      ],
      [
        635.5,
        499.13
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 681.05,
        "y": 590.54,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 319.01,
        "y": 590.54,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 500.03,
        "y": 454.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 681.05,
        "y": 454.77,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 319.01,
        "y": 319.01,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 296.38,
        "y": 432.15,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 703.67,
        "y": 364.27,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          500.03,
          500.03
        ],
        [
          635.79,
          500.03
        ]
      ],
      [
        [
          635.8,
          500.03
        ],
        [
          771.56,
          500.03
        ]
      ],
      [
        [
          364.27,
          500.03
        ],
        [
          500.03,
          500.03
        ]
      ],
      [
        [
          228.5,
          500.03
        ],
        [
          364.26,
          500.03
        ]
      ],
      [
        [
          635.8,
          364.26
        ],
        [
          771.56,
          500.02
        ]
      ],
      [
        [
          364.26,
          364.26
        ],
        [
          228.5,
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
        547.81,
        247.44
      ],
      [
        819.56,
        247.44
      ],
      [
        819.56,
        247.81
      ],
      [
        548.06,
        519.19
      ],
      [
        548.06,
        560.31
      ],
      [
        740.06,
        752.19
      ],
      [
        740.06,
        752.56
      ],
      [
        547.81,
        752.56
      ],
      [
        452.56,
        657.19
      ],
      [
        452.06,
        657.31
      ],
      [
        452.06,
        736.06
      ],
      [
        180.44,
        736.06
      ],
      [
        180.44,
        735.69
      ],
      [
        451.56,
        464.69
      ],
      [
        451.56,
        464.19
      ],
      [
        259.94,
        272.69
      ],
      [
        259.94,
        272.31
      ],
      [
        452.19,
        272.31
      ],
      [
        547.31,
        367.56
      ],
      [
        547.69,
        367.56
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 638.48,
        "y": 338.07,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 361.46,
        "y": 645.48,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 611.97,
        "y": 688.46,
        "angle": 180,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 515.97,
        "y": 656.46,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 355.97,
        "y": 304.46,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "S",
        "x": 451.97,
        "y": 368.46,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.97,
        "y": 512.46,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          547.97,
          519.09
        ],
        [
          547.97,
          368.46
        ]
      ],
      [
        [
          451.97,
          464.46
        ],
        [
          451.97,
          656.46
        ]
      ],
      [
        [
          547.97,
          560.46
        ],
        [
          547.97,
          752.46
        ]
      ],
      [
        [
          451.97,
          656.46
        ],
        [
          547.97,
          560.46
        ]
      ],
      [
        [
          451.97,
          272.46
        ],
        [
          355.97,
          368.46
        ]
      ],
      [
        [
          547.97,
          368.46
        ],
        [
          451.97,
          464.46
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
        160.5,
        206.63
      ],
      [
        432.25,
        206.63
      ],
      [
        432.25,
        342.38
      ],
      [
        567.25,
        477.38
      ],
      [
        567.75,
        477.25
      ],
      [
        567.75,
        206.63
      ],
      [
        839.5,
        206.63
      ],
      [
        839.5,
        207
      ],
      [
        568,
        478.38
      ],
      [
        568,
        614.13
      ],
      [
        567.63,
        614.13
      ],
      [
        555.75,
        602.13
      ],
      [
        555.25,
        602.25
      ],
      [
        555.25,
        793.38
      ],
      [
        363,
        793.38
      ],
      [
        363,
        409.38
      ],
      [
        160.5,
        207
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 658.43,
        "y": 297.26,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 427.16,
        "y": 601.29,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 491.16,
        "y": 729.29,
        "angle": 90,
        "flipped": true
      },
      {
        "id": "T4",
        "x": 386.9,
        "y": 387.77,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 251.13,
        "y": 252,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 364.27,
        "y": 274.63,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500.04,
        "y": 478.28,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          555.16,
          601.29
        ],
        [
          363.16,
          793.29
        ]
      ],
      [
        [
          363.16,
          409.29
        ],
        [
          432.15,
          478.28
        ]
      ],
      [
        [
          432.15,
          478.28
        ],
        [
          555.16,
          601.29
        ]
      ],
      [
        [
          296.39,
          342.52
        ],
        [
          432.15,
          342.52
        ]
      ],
      [
        [
          432.15,
          342.52
        ],
        [
          432.15,
          478.28
        ]
      ],
      [
        [
          296.38,
          206.75
        ],
        [
          296.38,
          342.51
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
        431.94,
        228.37
      ],
      [
        839.44,
        228.37
      ],
      [
        839.44,
        228.75
      ],
      [
        432.94,
        635.13
      ],
      [
        433.06,
        635.63
      ],
      [
        703.69,
        635.63
      ],
      [
        703.69,
        636
      ],
      [
        568.06,
        771.63
      ],
      [
        160.56,
        771.63
      ],
      [
        160.56,
        771.25
      ],
      [
        567.06,
        364.87
      ],
      [
        566.94,
        364.37
      ],
      [
        296.31,
        364.37
      ],
      [
        296.31,
        364
      ]
    ],
    "holes": [],
    "solution": [
      {
        "id": "T1",
        "x": 658.37,
        "y": 319.01,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 341.58,
        "y": 681.05,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.09,
        "y": 319.01,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.11,
        "y": 681.05,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.6,
        "y": 273.75,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "S",
        "x": 499.97,
        "y": 703.67,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 499.97,
        "y": 500.03,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          567.86,
          364.26
        ],
        [
          567.86,
          228.5
        ]
      ],
      [
        [
          567.86,
          500.03
        ],
        [
          567.86,
          364.27
        ]
      ],
      [
        [
          432.09,
          635.79
        ],
        [
          432.09,
          771.55
        ]
      ],
      [
        [
          432.09,
          500.03
        ],
        [
          432.09,
          635.79
        ]
      ],
      [
        [
          432.09,
          228.5
        ],
        [
          567.85,
          364.26
        ]
      ],
      [
        [
          567.86,
          771.55
        ],
        [
          567.86,
          635.8
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
  {"id":51,"chapter":3,"name":"蛇","tip":"生肖·七巧 · 盘曲蜿蜒 · 蛇","outline":[[28.23,308],[299.76,308],[491.76,500],[683.76,308],[875.76,500],[971.76,596],[779.76,596],[683.76,500],[491.76,692],[299.76,500],[299.76,443.76],[28.23,443.76]],"solution":[{"id":"T1","x":683.76,"y":436,"angle":180,"flipped":false},{"id":"S","x":231.88,"y":375.88,"angle":45,"flipped":false},{"id":"T2","x":491.76,"y":564,"angle":0,"flipped":false},{"id":"T3","x":363.76,"y":436,"angle":180,"flipped":true},{"id":"P","x":827.76,"y":548,"angle":0,"flipped":true},{"id":"T5","x":118.74,"y":398.51,"angle":315,"flipped":false},{"id":"T4","x":73.48,"y":353.26,"angle":135,"flipped":false}],"splitLines":[[[491.76,500],[676.26,500]],[[676.26,500],[868.26,500]],[[292.26,500],[484.26,500]],[[292.26,308],[292.26,443.76]],[[156.49,443.76],[156.49,308]],[[20.73,443.76],[156.49,308.01]]],"holes":[],"hintTier":1,"parTime":90,"parSteps":18,"needFlip":true},
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
