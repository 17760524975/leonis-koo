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
    "id": 8,
    "chapter": 1,
    "name": "大三角·立",
    "tip": "几何·入门 · 七块板拼出剪影",
    "outline": [
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
        308
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
        "y": 372,
        "angle": 90,
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
        "y": 436,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 468,
        "y": 596,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 260,
        "y": 356,
        "angle": 0,
        "flipped": true
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
          500,
          500
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
          308,
          308
        ]
      ],
      [
        [
          212,
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
          308,
          500
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
        692,
        500
      ],
      [
        308,
        884
      ],
      [
        308,
        500
      ],
      [
        692,
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
        "x": 628,
        "y": 436,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "S",
        "x": 596,
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
        "x": 660,
        "y": 212,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 452,
        "y": 452,
        "angle": 0,
        "flipped": false
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
          500,
          500
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
          692,
          308
        ]
      ],
      [
        [
          500,
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
          404,
          404
        ]
      ],
      [
        [
          692,
          308
        ],
        [
          596,
          212
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
        308
      ],
      [
        556.24,
        308
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
        692
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 364.24,
        "y": 372,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 236.23,
        "y": 500,
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
          308
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
          500
        ]
      ],
      [
        [
          364.24,
          500
        ],
        [
          172.24,
          308
        ]
      ],
      [
        [
          364.24,
          500
        ],
        [
          284.71,
          579.53
        ]
      ],
      [
        [
          692,
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
          692,
          579.53
        ],
        [
          692,
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
    "tip": "字母·七巧 · 七块板拼出大写 A",
    "outline": [
      [
        433.24,
        228.68
      ],
      [
        569.13,
        228.68
      ],
      [
        704.68,
        364.24
      ],
      [
        702.35,
        364.57
      ],
      [
        702.35,
        748.25
      ],
      [
        701.35,
        747.25
      ],
      [
        565.8,
        747.25
      ],
      [
        565.8,
        611.69
      ],
      [
        510.17,
        556.41
      ],
      [
        295.35,
        771.56
      ],
      [
        295.35,
        499.78
      ],
      [
        297.68,
        499.78
      ],
      [
        297.68,
        364.24
      ]
    ],
    "holes": [
      [
        [
          433.91,
          364.57
        ],
        [
          433.57,
          499.78
        ],
        [
          566.46,
          499.78
        ],
        [
          566.46,
          364.57
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 638.47,
        "y": 556.24,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.69,
        "y": 590.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.05,
        "y": 318.98,
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
        "x": 611.19,
        "y": 702.2,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 611.96,
        "y": 409.49,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 433.29,
        "y": 296.35,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          510.47,
          556.24
        ],
        [
          702.47,
          364.24
        ]
      ],
      [
        [
          702.47,
          748.24
        ],
        [
          510.47,
          556.24
        ]
      ],
      [
        [
          295.18,
          500
        ],
        [
          566.71,
          500
        ]
      ],
      [
        [
          297.53,
          364.24
        ],
        [
          433.29,
          364.24
        ]
      ],
      [
        [
          433.29,
          364.24
        ],
        [
          433.29,
          500
        ]
      ],
      [
        [
          433.29,
          500
        ],
        [
          297.53,
          500
        ]
      ],
      [
        [
          704.82,
          364.24
        ],
        [
          433.29,
          364.24
        ]
      ],
      [
        [
          433.29,
          364.24
        ],
        [
          569.05,
          228.47
        ]
      ],
      [
        [
          433.29,
          364.24
        ],
        [
          569.06,
          228.47
        ]
      ],
      [
        [
          565.93,
          611.69
        ],
        [
          701.7,
          747.46
        ]
      ],
      [
        [
          566.71,
          364.24
        ],
        [
          702.47,
          364.24
        ]
      ],
      [
        [
          702.47,
          364.24
        ],
        [
          566.71,
          500
        ]
      ],
      [
        [
          566.71,
          500
        ],
        [
          566.71,
          364.24
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
    "name": "B",
    "tip": "字母·七巧 · 七块板拼出大写 B",
    "outline": [
      [
        567.54,
        228.92
      ],
      [
        703.31,
        364.37
      ],
      [
        700.32,
        364.7
      ],
      [
        565.54,
        499.47
      ],
      [
        683.35,
        499.8
      ],
      [
        683.35,
        691.83
      ],
      [
        663.04,
        671.86
      ],
      [
        567.54,
        767.36
      ],
      [
        571.19,
        771.36
      ],
      [
        299.64,
        771.36
      ],
      [
        299.64,
        500.8
      ],
      [
        296.64,
        503.47
      ],
      [
        296.64,
        231.92
      ],
      [
        567.54,
        231.92
      ]
    ],
    "holes": [
      [
        [
          567.54,
          232.58
        ],
        [
          300.64,
          499.8
        ],
        [
          429.76,
          499.8
        ],
        [
          564.87,
          364.37
        ],
        [
          567.54,
          364.37
        ]
      ],
      [
        [
          491.66,
          500.14
        ],
        [
          395.82,
          595.65
        ],
        [
          471.36,
          671.52
        ],
        [
          567.2,
          576.02
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.86,
        "y": 322.16,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 390.05,
        "y": 681.02,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 619.53,
        "y": 564,
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
        "x": 613.14,
        "y": 318.98,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 395.54,
        "y": 532,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 565.13,
        "y": 432.12,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          567.88,
          231.65
        ],
        [
          296.35,
          503.18
        ]
      ],
      [
        [
          299.54,
          500
        ],
        [
          571.06,
          771.53
        ]
      ],
      [
        [
          567.42,
          575.88
        ],
        [
          663.42,
          671.88
        ]
      ],
      [
        [
          567.42,
          767.88
        ],
        [
          471.42,
          671.88
        ]
      ],
      [
        [
          471.42,
          671.88
        ],
        [
          567.42,
          575.88
        ]
      ],
      [
        [
          683.53,
          692
        ],
        [
          491.53,
          500
        ]
      ],
      [
        [
          700.89,
          364.24
        ],
        [
          565.13,
          364.24
        ]
      ],
      [
        [
          565.13,
          364.24
        ],
        [
          429.37,
          500
        ]
      ],
      [
        [
          429.37,
          500
        ],
        [
          565.13,
          500
        ]
      ],
      [
        [
          567.88,
          364.23
        ],
        [
          567.88,
          228.47
        ]
      ],
      [
        [
          703.65,
          364.23
        ],
        [
          567.88,
          364.23
        ]
      ],
      [
        [
          395.54,
          596
        ],
        [
          299.54,
          500
        ]
      ],
      [
        [
          299.54,
          500
        ],
        [
          491.54,
          500
        ]
      ],
      [
        [
          491.54,
          500
        ],
        [
          395.54,
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
    "id": 13,
    "chapter": 2,
    "name": "C",
    "tip": "字母·七巧 · 七块板拼出大写 C",
    "outline": [
      [
        480.58,
        201.13
      ],
      [
        480.91,
        204.46
      ],
      [
        616.47,
        204.46
      ],
      [
        616.47,
        208.46
      ],
      [
        712.39,
        304.05
      ],
      [
        616.47,
        400.3
      ],
      [
        616.14,
        340.35
      ],
      [
        480.91,
        340.35
      ],
      [
        480.91,
        585.15
      ],
      [
        558.85,
        663.09
      ],
      [
        694.74,
        527.54
      ],
      [
        694.74,
        663.43
      ],
      [
        559.19,
        798.98
      ],
      [
        423.3,
        798.98
      ],
      [
        287.74,
        663.43
      ],
      [
        287.74,
        391.65
      ],
      [
        289.07,
        392.65
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 378.1,
        "y": 572.85,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 416.64,
        "y": 392.88,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 423.36,
        "y": 708.61,
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
        "x": 648.41,
        "y": 303.89,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 649.63,
        "y": 618.1,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 559.12,
        "y": 731.24,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          287.59,
          391.83
        ],
        [
          559.12,
          663.36
        ]
      ],
      [
        [
          559.12,
          663.36
        ],
        [
          287.59,
          663.36
        ]
      ],
      [
        [
          480.64,
          584.88
        ],
        [
          288.64,
          392.88
        ]
      ],
      [
        [
          616.41,
          204.34
        ],
        [
          616.41,
          340.1
        ]
      ],
      [
        [
          480.64,
          340.1
        ],
        [
          480.64,
          204.34
        ]
      ],
      [
        [
          694.88,
          663.36
        ],
        [
          559.12,
          663.36
        ]
      ],
      [
        [
          559.12,
          663.36
        ],
        [
          423.36,
          799.12
        ]
      ],
      [
        [
          616.41,
          399.89
        ],
        [
          616.41,
          207.89
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 14,
    "chapter": 2,
    "name": "D",
    "tip": "字母·七巧 · 七块板拼出大写 D",
    "outline": [
      [
        296.58,
        227.48
      ],
      [
        568.01,
        227.48
      ],
      [
        565.68,
        230.15
      ],
      [
        701.23,
        365.36
      ],
      [
        701.23,
        636.79
      ],
      [
        706.23,
        637.12
      ],
      [
        570.67,
        772.67
      ],
      [
        565.35,
        767.34
      ],
      [
        293.92,
        767.34
      ],
      [
        293.92,
        495.91
      ],
      [
        296.58,
        498.24
      ]
    ],
    "holes": [
      [
        [
          430.13,
          365.69
        ],
        [
          296.91,
          498.91
        ],
        [
          434.79,
          636.79
        ],
        [
          565.35,
          636.79
        ],
        [
          565.35,
          365.69
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 384.26,
        "y": 677.04,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 387,
        "y": 317.75,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 570.49,
        "y": 682.25,
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
        "x": 520.3,
        "y": 320.21,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 610.81,
        "y": 455.98,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 633.44,
        "y": 365.47,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          293.75,
          496.03
        ],
        [
          565.28,
          767.55
        ]
      ],
      [
        [
          568.02,
          227.24
        ],
        [
          296.49,
          498.77
        ]
      ],
      [
        [
          434.72,
          637
        ],
        [
          706.25,
          637
        ]
      ],
      [
        [
          570.49,
          772.76
        ],
        [
          434.72,
          637
        ]
      ],
      [
        [
          565.56,
          501.23
        ],
        [
          701.32,
          501.23
        ]
      ],
      [
        [
          701.32,
          637
        ],
        [
          565.56,
          637
        ]
      ],
      [
        [
          565.56,
          637
        ],
        [
          565.56,
          501.23
        ]
      ],
      [
        [
          565.56,
          229.7
        ],
        [
          565.56,
          365.47
        ]
      ],
      [
        [
          565.56,
          365.47
        ],
        [
          701.32,
          501.23
        ]
      ],
      [
        [
          565.56,
          365.47
        ],
        [
          429.79,
          365.47
        ]
      ],
      [
        [
          429.79,
          365.47
        ],
        [
          565.56,
          229.7
        ]
      ],
      [
        [
          565.56,
          501.23
        ],
        [
          565.56,
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
    "id": 15,
    "chapter": 2,
    "name": "E",
    "tip": "字母·七巧 · 七块板拼出大写 E",
    "outline": [
      [
        297.77,
        228.84
      ],
      [
        704.89,
        228.84
      ],
      [
        569.4,
        364.65
      ],
      [
        433.59,
        364.65
      ],
      [
        433.59,
        430.89
      ],
      [
        569.4,
        430.89
      ],
      [
        569.4,
        567.05
      ],
      [
        433.59,
        567.05
      ],
      [
        433.59,
        635.28
      ],
      [
        569.4,
        635.28
      ],
      [
        704.89,
        771.43
      ],
      [
        569.07,
        771.43
      ],
      [
        566.41,
        768.43
      ],
      [
        295.11,
        768.43
      ],
      [
        295.11,
        496.8
      ],
      [
        297.77,
        499.14
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388.31,
        "y": 318.98,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.41,
        "y": 678.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 388.31,
        "y": 500,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 501.45,
        "y": 498.97,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 614.59,
        "y": 273.73,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 524.08,
        "y": 318.98,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 569.33,
        "y": 703.65,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          294.9,
          497.1
        ],
        [
          566.43,
          768.63
        ]
      ],
      [
        [
          433.57,
          566.85
        ],
        [
          433.57,
          431.09
        ]
      ],
      [
        [
          433.57,
          364.24
        ],
        [
          433.57,
          635.76
        ]
      ],
      [
        [
          433.57,
          635.76
        ],
        [
          297.8,
          500
        ]
      ],
      [
        [
          297.8,
          500
        ],
        [
          433.57,
          364.24
        ]
      ],
      [
        [
          569.33,
          771.53
        ],
        [
          433.57,
          635.76
        ]
      ],
      [
        [
          569.33,
          364.24
        ],
        [
          569.33,
          228.47
        ]
      ],
      [
        [
          433.57,
          364.24
        ],
        [
          569.33,
          228.47
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
    "name": "F",
    "tip": "字母·七巧 · 七块板拼出大写 F",
    "outline": [
      [
        568.48,
        200.58
      ],
      [
        704.35,
        200.58
      ],
      [
        700.36,
        204.58
      ],
      [
        700.36,
        340.12
      ],
      [
        564.48,
        340.12
      ],
      [
        567.81,
        336.46
      ],
      [
        432.93,
        336.46
      ],
      [
        432.93,
        471.67
      ],
      [
        681.04,
        472
      ],
      [
        489.22,
        663.82
      ],
      [
        433.6,
        663.82
      ],
      [
        433.6,
        799.37
      ],
      [
        297.4,
        799.37
      ],
      [
        295.73,
        201.92
      ],
      [
        567.48,
        201.92
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 386.1,
        "y": 292.39,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 489.12,
        "y": 535.88,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 361.12,
        "y": 599.88,
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
        "x": 655.26,
        "y": 294.76,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 387.63,
        "y": 426.63,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 568.64,
        "y": 268.24,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          567.12,
          201.88
        ],
        [
          295.59,
          473.41
        ]
      ],
      [
        [
          489.12,
          663.88
        ],
        [
          297.12,
          471.88
        ]
      ],
      [
        [
          297.5,
          663.88
        ],
        [
          433.26,
          663.88
        ]
      ],
      [
        [
          568.64,
          200.35
        ],
        [
          432.88,
          336.12
        ]
      ],
      [
        [
          568.64,
          336.12
        ],
        [
          704.41,
          200.35
        ]
      ],
      [
        [
          489.12,
          663.88
        ],
        [
          297.12,
          663.88
        ]
      ],
      [
        [
          564.75,
          340.02
        ],
        [
          700.51,
          204.25
        ]
      ],
      [
        [
          432.88,
          471.88
        ],
        [
          297.12,
          471.88
        ]
      ],
      [
        [
          297.12,
          471.88
        ],
        [
          432.88,
          336.12
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
    "name": "G",
    "tip": "字母·七巧 · 七块板拼出大写 G",
    "outline": [
      [
        490.34,
        201.63
      ],
      [
        490.68,
        205.63
      ],
      [
        626.23,
        205.63
      ],
      [
        490.68,
        341.19
      ],
      [
        490.68,
        585.67
      ],
      [
        567.62,
        662.6
      ],
      [
        602.92,
        627.63
      ],
      [
        507,
        531.71
      ],
      [
        602.92,
        435.45
      ],
      [
        698.84,
        531.37
      ],
      [
        703.51,
        527.04
      ],
      [
        703.51,
        662.93
      ],
      [
        567.95,
        798.49
      ],
      [
        432.06,
        798.49
      ],
      [
        296.5,
        662.93
      ],
      [
        296.5,
        391.15
      ],
      [
        298.83,
        393.15
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 426.37,
        "y": 393.36,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 386.86,
        "y": 572.36,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.12,
        "y": 708.13,
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
        "x": 535.63,
        "y": 250.81,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.63,
        "y": 753.38,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 635.76,
        "y": 662.87,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          490.37,
          585.36
        ],
        [
          298.37,
          393.36
        ]
      ],
      [
        [
          296.35,
          391.34
        ],
        [
          567.88,
          662.87
        ]
      ],
      [
        [
          567.88,
          662.87
        ],
        [
          296.35,
          662.87
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
          567.88,
          798.64
        ],
        [
          567.88,
          662.87
        ]
      ],
      [
        [
          567.88,
          662.87
        ],
        [
          703.65,
          527.11
        ]
      ],
      [
        [
          567.88,
          662.87
        ],
        [
          432.12,
          798.64
        ]
      ],
      [
        [
          490.37,
          341.32
        ],
        [
          490.37,
          205.56
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 18,
    "chapter": 2,
    "name": "H",
    "tip": "字母·七巧 · 七块板拼出大写 H",
    "outline": [
      [
        572.4,
        241.68
      ],
      [
        708.19,
        241.68
      ],
      [
        708.19,
        377.13
      ],
      [
        716.51,
        377.13
      ],
      [
        716.51,
        648.4
      ],
      [
        690.55,
        622.77
      ],
      [
        690.55,
        758.56
      ],
      [
        554.75,
        622.77
      ],
      [
        554.75,
        519.92
      ],
      [
        493.84,
        519.92
      ],
      [
        442.25,
        571.51
      ],
      [
        442.25,
        707.31
      ],
      [
        306.45,
        707.31
      ],
      [
        302.13,
        711.63
      ],
      [
        302.13,
        519.92
      ],
      [
        283.83,
        519.92
      ],
      [
        283.83,
        248.33
      ],
      [
        554.75,
        519.26
      ],
      [
        554.75,
        486.97
      ],
      [
        445.59,
        377.8
      ],
      [
        444.92,
        382.47
      ],
      [
        309.45,
        246.33
      ],
      [
        445.25,
        246.33
      ],
      [
        445.25,
        377.13
      ],
      [
        572.4,
        377.13
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 374.01,
        "y": 429.2,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 625.99,
        "y": 467.6,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 366.08,
        "y": 583.71,
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
        "x": 396.82,
        "y": 662.22,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 399.72,
        "y": 291.48,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 622.91,
        "y": 622.91,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          555.03,
          519.71
        ],
        [
          283.5,
          519.71
        ]
      ],
      [
        [
          716.5,
          648.62
        ],
        [
          444.97,
          377.09
        ]
      ],
      [
        [
          444.97,
          377.09
        ],
        [
          716.5,
          377.09
        ]
      ],
      [
        [
          690.79,
          622.91
        ],
        [
          555.03,
          487.14
        ]
      ],
      [
        [
          708.48,
          377.09
        ],
        [
          572.71,
          377.09
        ]
      ],
      [
        [
          494.08,
          519.71
        ],
        [
          302.08,
          711.71
        ]
      ],
      [
        [
          302.08,
          519.71
        ],
        [
          494.08,
          519.71
        ]
      ],
      [
        [
          306.31,
          707.48
        ],
        [
          442.07,
          571.71
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 19,
    "chapter": 2,
    "name": "I",
    "tip": "字母·七巧 · 七块板拼出大写 I",
    "outline": [
      [
        332.45,
        182.43
      ],
      [
        716.32,
        182.43
      ],
      [
        620.43,
        278.31
      ],
      [
        620.43,
        470.09
      ],
      [
        610.77,
        461.1
      ],
      [
        599.13,
        472.75
      ],
      [
        599.13,
        657.19
      ],
      [
        734.63,
        657.19
      ],
      [
        734.63,
        793.03
      ],
      [
        598.79,
        793.03
      ],
      [
        598.79,
        744.09
      ],
      [
        536.86,
        682.5
      ],
      [
        536.86,
        817.67
      ],
      [
        265.53,
        817.67
      ],
      [
        401.02,
        681.83
      ],
      [
        536.2,
        681.83
      ],
      [
        463.62,
        608.59
      ],
      [
        419,
        652.87
      ],
      [
        419,
        269
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 524.32,
        "y": 246.04,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 483.12,
        "y": 460.84,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 553.76,
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
        "x": 588.32,
        "y": 374.04,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 491.49,
        "y": 772.71,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 400.98,
        "y": 750.08,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          524.32,
          374.04
        ],
        [
          332.32,
          182.04
        ]
      ],
      [
        [
          611.12,
          460.84
        ],
        [
          419.12,
          652.84
        ]
      ],
      [
        [
          419.12,
          268.84
        ],
        [
          611.12,
          460.84
        ]
      ],
      [
        [
          599.02,
          793.28
        ],
        [
          599.02,
          657.51
        ]
      ],
      [
        [
          463.26,
          608.71
        ],
        [
          599.02,
          472.94
        ]
      ],
      [
        [
          400.98,
          817.96
        ],
        [
          536.74,
          682.2
        ]
      ],
      [
        [
          524.32,
          374.04
        ],
        [
          620.32,
          278.04
        ]
      ],
      [
        [
          620.32,
          470.04
        ],
        [
          524.32,
          374.04
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": true
  },
  {
    "id": 20,
    "chapter": 2,
    "name": "J",
    "tip": "字母·七巧 · 七块板拼出大写 J",
    "outline": [
      [
        355.86,
        164.39
      ],
      [
        739.72,
        164.39
      ],
      [
        643.84,
        260.27
      ],
      [
        644.17,
        644.13
      ],
      [
        452.4,
        835.89
      ],
      [
        260.31,
        644.13
      ],
      [
        355.86,
        547.92
      ],
      [
        451.74,
        643.47
      ],
      [
        451.74,
        260.27
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 548,
        "y": 228,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 516,
        "y": 452,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 580,
        "y": 580,
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
        "y": 772,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 612,
        "y": 356,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 692,
        "angle": 0,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          644,
          452
        ],
        [
          452,
          644
        ]
      ],
      [
        [
          452,
          260
        ],
        [
          644,
          452
        ]
      ],
      [
        [
          452,
          644
        ],
        [
          356,
          740
        ]
      ],
      [
        [
          548,
          740
        ],
        [
          356,
          740
        ]
      ],
      [
        [
          452,
          644
        ],
        [
          644,
          644
        ]
      ],
      [
        [
          548,
          356
        ],
        [
          644,
          260
        ]
      ],
      [
        [
          644,
          452
        ],
        [
          548,
          356
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 21,
    "chapter": 2,
    "name": "K",
    "tip": "字母·七巧 · 七块板拼出大写 K",
    "outline": [
      [
        556.08,
        186.41
      ],
      [
        652.32,
        282.65
      ],
      [
        460.5,
        474.15
      ],
      [
        731.59,
        745.57
      ],
      [
        595.71,
        745.57
      ],
      [
        472.15,
        622.02
      ],
      [
        280.33,
        813.84
      ],
      [
        280.33,
        429.85
      ],
      [
        268.34,
        418.2
      ],
      [
        268.34,
        226.03
      ],
      [
        460.5,
        226.03
      ],
      [
        460.84,
        281.98
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 344.22,
        "y": 621.85,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 396.28,
        "y": 417.91,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 332.19,
        "y": 290,
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
        "x": 505.54,
        "y": 564.66,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 492.28,
        "y": 378.15,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "P",
        "x": 596.05,
        "y": 677.79,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          280.22,
          429.85
        ],
        [
          472.22,
          621.85
        ]
      ],
      [
        [
          268.28,
          417.91
        ],
        [
          460.28,
          225.91
        ]
      ],
      [
        [
          460.28,
          225.91
        ],
        [
          460.28,
          609.91
        ]
      ],
      [
        [
          460.28,
          609.91
        ],
        [
          268.28,
          417.91
        ]
      ],
      [
        [
          556.28,
          378.15
        ],
        [
          460.28,
          282.15
        ]
      ],
      [
        [
          460.28,
          609.91
        ],
        [
          596.05,
          609.91
        ]
      ],
      [
        [
          460.19,
          226
        ],
        [
          268.19,
          418
        ]
      ],
      [
        [
          460.28,
          609.91
        ],
        [
          460.28,
          474.15
        ]
      ],
      [
        [
          460.28,
          474.15
        ],
        [
          460.28,
          282.15
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 22,
    "chapter": 2,
    "name": "L",
    "tip": "字母·七巧 · 七块板拼出大写 L",
    "outline": [
      [
        266.83,
        211.64
      ],
      [
        458.97,
        211.64
      ],
      [
        458.97,
        594.6
      ],
      [
        464.64,
        589.28
      ],
      [
        560.21,
        685.18
      ],
      [
        597.17,
        648.22
      ],
      [
        733.04,
        648.22
      ],
      [
        728.72,
        652.54
      ],
      [
        728.72,
        788.74
      ],
      [
        592.85,
        788.74
      ],
      [
        597.17,
        784.09
      ],
      [
        461.64,
        784.09
      ],
      [
        463.97,
        781.42
      ],
      [
        272.48,
        781.42
      ],
      [
        266.83,
        787.09
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 330.68,
        "y": 595.31,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 394.68,
        "y": 403.31,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 330.68,
        "y": 275.31,
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
        "x": 683.56,
        "y": 743.44,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 368.51,
        "y": 749.47,
        "angle": 180,
        "flipped": false
      },
      {
        "id": "P",
        "x": 597.56,
        "y": 716.31,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          458.68,
          595.31
        ],
        [
          266.68,
          787.31
        ]
      ],
      [
        [
          266.68,
          403.31
        ],
        [
          458.68,
          595.31
        ]
      ],
      [
        [
          266.68,
          403.31
        ],
        [
          458.68,
          211.31
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
          464.51,
          781.47
        ],
        [
          368.51,
          685.47
        ]
      ],
      [
        [
          368.51,
          685.47
        ],
        [
          464.51,
          589.47
        ]
      ],
      [
        [
          597.56,
          648.43
        ],
        [
          461.79,
          784.19
        ]
      ],
      [
        [
          597.56,
          784.19
        ],
        [
          733.32,
          648.43
        ]
      ],
      [
        [
          593.05,
          788.69
        ],
        [
          728.82,
          652.93
        ]
      ],
      [
        [
          272.51,
          781.47
        ],
        [
          368.51,
          685.47
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
    "name": "M",
    "tip": "字母·七巧 · 七块板拼出大写 M",
    "outline": [
      [
        690.99,
        219.36
      ],
      [
        691.32,
        603.2
      ],
      [
        731.6,
        643.14
      ],
      [
        731.6,
        778.97
      ],
      [
        730.27,
        777.64
      ],
      [
        594.12,
        777.64
      ],
      [
        595.78,
        508.32
      ],
      [
        500.24,
        603.86
      ],
      [
        404.36,
        508.32
      ],
      [
        404.36,
        779.31
      ],
      [
        406.02,
        780.97
      ],
      [
        270.2,
        780.97
      ],
      [
        270.2,
        644.81
      ],
      [
        268.54,
        643.14
      ],
      [
        308.15,
        603.86
      ],
      [
        308.15,
        220.03
      ],
      [
        499.57,
        411.11
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 372,
        "y": 411.71,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 627.26,
        "y": 410.97,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 358.75,
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
        "x": 315.28,
        "y": 735.78,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 639.7,
        "y": 732.44,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 663.88,
        "y": 643.48,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          500,
          411.71
        ],
        [
          596,
          507.71
        ]
      ],
      [
        [
          404,
          507.71
        ],
        [
          500,
          411.71
        ]
      ],
      [
        [
          404,
          779.24
        ],
        [
          268.24,
          643.48
        ]
      ],
      [
        [
          268.24,
          643.48
        ],
        [
          404,
          507.71
        ]
      ],
      [
        [
          731.76,
          643.48
        ],
        [
          596,
          507.71
        ]
      ],
      [
        [
          596,
          643.48
        ],
        [
          731.76,
          779.24
        ]
      ],
      [
        [
          270.03,
          645.27
        ],
        [
          405.79,
          781.03
        ]
      ],
      [
        [
          594.45,
          641.93
        ],
        [
          730.21,
          777.69
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
    "name": "N",
    "tip": "字母·七巧 · 七块板拼出大写 N",
    "outline": [
      [
        265.24,
        204.37
      ],
      [
        457.21,
        396
      ],
      [
        329.12,
        524.43
      ],
      [
        598.94,
        524.43
      ],
      [
        598.94,
        253.6
      ],
      [
        735.02,
        253.6
      ],
      [
        735.02,
        772.62
      ],
      [
        542.72,
        580.98
      ],
      [
        463.87,
        660.5
      ],
      [
        454.55,
        660.5
      ],
      [
        454.55,
        795.91
      ],
      [
        318.81,
        795.91
      ],
      [
        318.81,
        660.17
      ],
      [
        328.12,
        660.17
      ],
      [
        328.12,
        525.42
      ],
      [
        265.24,
        587.97
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 328.79,
        "y": 395.78,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 671.17,
        "y": 580.93,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 644.66,
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
        "x": 689.95,
        "y": 298.45,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 373.14,
        "y": 569.94,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 463.65,
        "y": 592.57,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          543.17,
          580.93
        ],
        [
          735.17,
          388.93
        ]
      ],
      [
        [
          318.69,
          660.45
        ],
        [
          454.45,
          660.45
        ]
      ],
      [
        [
          599.41,
          253.16
        ],
        [
          735.17,
          388.93
        ]
      ],
      [
        [
          735.17,
          388.93
        ],
        [
          599.41,
          524.69
        ]
      ],
      [
        [
          463.65,
          524.69
        ],
        [
          327.88,
          660.45
        ]
      ],
      [
        [
          327.88,
          660.45
        ],
        [
          463.65,
          660.45
        ]
      ],
      [
        [
          735.21,
          388.96
        ],
        [
          599.44,
          253.2
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
    "name": "O",
    "tip": "字母·七巧 · 七块板拼出大写 O",
    "outline": [
      [
        413.18,
        221.59
      ],
      [
        684.96,
        221.59
      ],
      [
        684.96,
        493.04
      ],
      [
        681.96,
        490.37
      ],
      [
        681.96,
        681.88
      ],
      [
        586.04,
        777.46
      ],
      [
        586.71,
        778.46
      ],
      [
        315.26,
        778.46
      ],
      [
        315.26,
        507.02
      ],
      [
        318.59,
        510.02
      ],
      [
        318.59,
        318.51
      ],
      [
        319.59,
        319.18
      ],
      [
        414.85,
        223.92
      ]
    ],
    "holes": [
      [
        [
          511.1,
          319.84
        ],
        [
          414.85,
          415.1
        ],
        [
          414.85,
          606.6
        ],
        [
          489.79,
          681.54
        ],
        [
          585.71,
          585.96
        ],
        [
          585.71,
          393.78
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 594.38,
        "y": 311.87,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 405.62,
        "y": 688.13,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 618,
        "y": 618,
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
        "x": 618,
        "y": 490,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 586,
        "y": 714,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "P",
        "x": 366.61,
        "y": 462.61,
        "angle": 90,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          684.89,
          492.89
        ],
        [
          413.36,
          221.36
        ]
      ],
      [
        [
          315.11,
          507.11
        ],
        [
          586.64,
          778.64
        ]
      ],
      [
        [
          415.29,
          223.29
        ],
        [
          511.29,
          319.29
        ]
      ],
      [
        [
          511.29,
          319.29
        ],
        [
          415.29,
          415.29
        ]
      ],
      [
        [
          415.29,
          415.29
        ],
        [
          319.29,
          319.29
        ]
      ],
      [
        [
          318.61,
          318.61
        ],
        [
          414.61,
          414.61
        ]
      ],
      [
        [
          414.61,
          414.61
        ],
        [
          414.61,
          606.61
        ]
      ],
      [
        [
          414.61,
          606.61
        ],
        [
          318.61,
          510.61
        ]
      ],
      [
        [
          490,
          682
        ],
        [
          682,
          490
        ]
      ],
      [
        [
          682,
          682
        ],
        [
          490,
          682
        ]
      ],
      [
        [
          682,
          490
        ],
        [
          586,
          586
        ]
      ],
      [
        [
          586,
          586
        ],
        [
          586,
          394
        ]
      ],
      [
        [
          586,
          394
        ],
        [
          682,
          490
        ]
      ],
      [
        [
          586,
          778
        ],
        [
          490,
          682
        ]
      ]
    ],
    "hintTier": 1,
    "parTime": 90,
    "parSteps": 18,
    "needFlip": false
  },
  {
    "id": 26,
    "chapter": 2,
    "name": "P",
    "tip": "字母·七巧 · 七块板拼出大写 P",
    "outline": [
      [
        568.86,
        228.73
      ],
      [
        705.04,
        364.25
      ],
      [
        705.04,
        500.1
      ],
      [
        569.2,
        635.61
      ],
      [
        433.68,
        635.61
      ],
      [
        433.68,
        771.45
      ],
      [
        297.83,
        771.45
      ],
      [
        297.83,
        500.43
      ],
      [
        295.16,
        502.76
      ],
      [
        295.16,
        231.4
      ],
      [
        566.53,
        231.4
      ]
    ],
    "holes": [
      [
        [
          434.01,
          364.58
        ],
        [
          433.68,
          499.76
        ],
        [
          568.86,
          499.76
        ],
        [
          568.86,
          364.58
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388.24,
        "y": 590.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.48,
        "y": 321.74,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.26,
        "y": 318.98,
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
        "x": 388.24,
        "y": 726.27,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388.24,
        "y": 454.74,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 569.26,
        "y": 567.88,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          297.73,
          500
        ],
        [
          569.26,
          500
        ]
      ],
      [
        [
          566.5,
          231.23
        ],
        [
          294.97,
          502.76
        ]
      ],
      [
        [
          705.02,
          500
        ],
        [
          569.26,
          500
        ]
      ],
      [
        [
          569.26,
          500
        ],
        [
          433.49,
          635.76
        ]
      ],
      [
        [
          569.26,
          364.24
        ],
        [
          705.03,
          364.24
        ]
      ],
      [
        [
          705.03,
          500
        ],
        [
          569.26,
          500
        ]
      ],
      [
        [
          569.26,
          500
        ],
        [
          569.26,
          364.24
        ]
      ],
      [
        [
          705.03,
          364.23
        ],
        [
          433.5,
          364.23
        ]
      ],
      [
        [
          433.5,
          364.23
        ],
        [
          569.26,
          228.47
        ]
      ],
      [
        [
          297.73,
          771.53
        ],
        [
          433.49,
          635.77
        ]
      ],
      [
        [
          433.5,
          500
        ],
        [
          297.73,
          500
        ]
      ],
      [
        [
          297.73,
          500
        ],
        [
          433.5,
          364.23
        ]
      ],
      [
        [
          433.5,
          364.23
        ],
        [
          433.5,
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
    "id": 27,
    "chapter": 2,
    "name": "Q",
    "tip": "字母·七巧 · 七块板拼出大写 Q",
    "outline": [
      [
        456.35,
        212.38
      ],
      [
        648.45,
        404.15
      ],
      [
        644.12,
        404.48
      ],
      [
        644.12,
        595.91
      ],
      [
        740,
        691.79
      ],
      [
        644.12,
        787.67
      ],
      [
        547.58,
        692.12
      ],
      [
        452.03,
        788
      ],
      [
        260.27,
        596.24
      ],
      [
        260.27,
        404.15
      ],
      [
        264.93,
        404.15
      ]
    ],
    "holes": [
      [
        [
          452.7,
          404.81
        ],
        [
          452.36,
          595.91
        ],
        [
          547.91,
          691.12
        ],
        [
          547.91,
          500.03
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388,
        "y": 596,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 456.59,
        "y": 340,
        "angle": 180,
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
        "id": "S",
        "x": 644,
        "y": 692,
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
          404
        ],
        [
          452,
          788
        ]
      ],
      [
        [
          648.59,
          404
        ],
        [
          264.59,
          404
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
          500
        ],
        [
          548,
          692
        ]
      ],
      [
        [
          260,
          404
        ],
        [
          452,
          404
        ]
      ],
      [
        [
          452,
          788
        ],
        [
          452,
          596
        ]
      ],
      [
        [
          452,
          596
        ],
        [
          548,
          692
        ]
      ],
      [
        [
          548,
          500
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
          644,
          404
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
    "name": "R",
    "tip": "字母·七巧 · 七块板拼出大写 R",
    "outline": [
      [
        298.06,
        228.78
      ],
      [
        569.39,
        228.78
      ],
      [
        704.89,
        364.27
      ],
      [
        698.89,
        364.6
      ],
      [
        698.89,
        500.1
      ],
      [
        566.72,
        500.1
      ],
      [
        701.89,
        635.26
      ],
      [
        701.89,
        771.42
      ],
      [
        566.06,
        635.59
      ],
      [
        566.06,
        500.43
      ],
      [
        434.56,
        631.59
      ],
      [
        434.56,
        767.76
      ],
      [
        298.73,
        767.76
      ],
      [
        295.07,
        771.42
      ],
      [
        295.07,
        499.76
      ],
      [
        298.06,
        499.76
      ]
    ],
    "holes": [
      [
        [
          434.23,
          364.6
        ],
        [
          433.89,
          499.76
        ],
        [
          563.07,
          499.76
        ],
        [
          563.07,
          364.6
        ]
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 388.37,
        "y": 318.98,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 385.35,
        "y": 590.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 569.39,
        "y": 318.98,
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
        "x": 388.97,
        "y": 722.66,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 388.37,
        "y": 454.75,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "P",
        "x": 634.26,
        "y": 635.77,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          569.39,
          228.47
        ],
        [
          297.86,
          500
        ]
      ],
      [
        [
          294.84,
          500
        ],
        [
          566.37,
          500
        ]
      ],
      [
        [
          566.37,
          500
        ],
        [
          294.84,
          771.53
        ]
      ],
      [
        [
          563.28,
          500
        ],
        [
          563.28,
          364.24
        ]
      ],
      [
        [
          563.28,
          364.24
        ],
        [
          699.04,
          364.24
        ]
      ],
      [
        [
          705.16,
          364.24
        ],
        [
          433.63,
          364.24
        ]
      ],
      [
        [
          433.63,
          364.24
        ],
        [
          569.39,
          228.47
        ]
      ],
      [
        [
          298.46,
          767.91
        ],
        [
          434.23,
          632.15
        ]
      ],
      [
        [
          433.63,
          500
        ],
        [
          297.86,
          500
        ]
      ],
      [
        [
          297.86,
          500
        ],
        [
          433.63,
          364.24
        ]
      ],
      [
        [
          433.63,
          364.24
        ],
        [
          433.63,
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
    "id": 29,
    "chapter": 2,
    "name": "S",
    "tip": "字母·七巧 · 七块板拼出大写 S",
    "outline": [
      [
        432.19,
        185.39
      ],
      [
        432.52,
        192.06
      ],
      [
        568.05,
        192.06
      ],
      [
        703.56,
        327.57
      ],
      [
        432.52,
        327.91
      ],
      [
        432.52,
        432.45
      ],
      [
        567.71,
        432.45
      ],
      [
        568.05,
        430.8
      ],
      [
        759.84,
        622.59
      ],
      [
        568.05,
        814.71
      ],
      [
        567.71,
        807.71
      ],
      [
        432.19,
        807.71
      ],
      [
        296.34,
        672.19
      ],
      [
        567.71,
        671.86
      ],
      [
        567.71,
        568.31
      ],
      [
        432.52,
        568.31
      ],
      [
        432.19,
        569.3
      ],
      [
        240.4,
        377.51
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 368.12,
        "y": 377.05,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 631.88,
        "y": 622.95,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 567.88,
        "y": 282.45,
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
        "x": 477.37,
        "y": 237.2,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.63,
        "y": 717.51,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 432.12,
        "y": 740.14,
        "angle": 45,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          432.12,
          327.71
        ],
        [
          567.88,
          191.94
        ]
      ],
      [
        [
          567.88,
          432.5
        ],
        [
          567.88,
          568.26
        ]
      ],
      [
        [
          432.12,
          568.26
        ],
        [
          432.12,
          432.5
        ]
      ],
      [
        [
          432.12,
          672.26
        ],
        [
          567.88,
          808.02
        ]
      ],
      [
        [
          432.12,
          327.71
        ],
        [
          432.12,
          191.94
        ]
      ],
      [
        [
          567.88,
          672.25
        ],
        [
          567.88,
          808.02
        ]
      ],
      [
        [
          567.88,
          808.02
        ],
        [
          432.12,
          672.25
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
    "name": "T",
    "tip": "字母·七巧 · 七块板拼出大写 T",
    "outline": [
      [
        200.49,
        200.31
      ],
      [
        607.63,
        200.31
      ],
      [
        607.63,
        213.96
      ],
      [
        799.54,
        213.96
      ],
      [
        607.63,
        405.86
      ],
      [
        607.96,
        607.76
      ],
      [
        416.05,
        799.67
      ],
      [
        415.72,
        415.53
      ],
      [
        337.42,
        337.24
      ],
      [
        201.49,
        337.24
      ],
      [
        201.49,
        201.3
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 479.94,
        "y": 607.79,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 381.37,
        "y": 290.72,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 671.65,
        "y": 277.93,
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
        "x": 246.73,
        "y": 291.84,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 562.39,
        "y": 381.23,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 539.76,
        "y": 471.74,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          415.94,
          415.79
        ],
        [
          607.94,
          607.79
        ]
      ],
      [
        [
          471.88,
          200.21
        ],
        [
          471.88,
          471.74
        ]
      ],
      [
        [
          607.65,
          405.93
        ],
        [
          607.65,
          213.93
        ]
      ],
      [
        [
          607.65,
          200.21
        ],
        [
          607.65,
          335.97
        ]
      ],
      [
        [
          607.65,
          335.97
        ],
        [
          471.88,
          335.97
        ]
      ],
      [
        [
          471.88,
          335.97
        ],
        [
          471.88,
          200.21
        ]
      ],
      [
        [
          607.65,
          471.74
        ],
        [
          471.88,
          335.97
        ]
      ],
      [
        [
          471.88,
          335.97
        ],
        [
          471.88,
          471.74
        ]
      ],
      [
        [
          471.88,
          471.74
        ],
        [
          607.65,
          607.5
        ]
      ],
      [
        [
          201.47,
          201.33
        ],
        [
          337.24,
          337.09
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
    "name": "U",
    "tip": "字母·七巧 · 七块板拼出大写 U",
    "outline": [
      [
        462.83,
        239.94
      ],
      [
        463.16,
        623.38
      ],
      [
        592.64,
        623.38
      ],
      [
        592.64,
        488.58
      ],
      [
        537.05,
        433.32
      ],
      [
        589.3,
        381.07
      ],
      [
        589.3,
        245.26
      ],
      [
        725.1,
        245.26
      ],
      [
        729.1,
        241.27
      ],
      [
        729.1,
        625.04
      ],
      [
        592.97,
        760.18
      ],
      [
        592.64,
        759.18
      ],
      [
        457.17,
        759.18
      ],
      [
        457.17,
        753.19
      ],
      [
        321.69,
        618.05
      ],
      [
        321.69,
        482.25
      ],
      [
        271.11,
        431.99
      ],
      [
        321.04,
        382.06
      ],
      [
        321.04,
        245.59
      ],
      [
        457.5,
        245.59
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 665.26,
        "y": 433.1,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 398.74,
        "y": 431.57,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 638.32,
        "y": 624.67,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "S",
        "x": 525.18,
        "y": 691.45,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 634.95,
        "y": 290.16,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 366.24,
        "y": 290.81,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 389.42,
        "y": 618.13,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          537.26,
          433.1
        ],
        [
          729.26,
          241.1
        ]
      ],
      [
        [
          729.26,
          625.1
        ],
        [
          537.26,
          433.1
        ]
      ],
      [
        [
          270.74,
          431.57
        ],
        [
          462.74,
          239.57
        ]
      ],
      [
        [
          462.74,
          623.57
        ],
        [
          270.74,
          431.57
        ]
      ],
      [
        [
          457.3,
          753.9
        ],
        [
          457.3,
          618.13
        ]
      ],
      [
        [
          457.3,
          618.13
        ],
        [
          321.54,
          482.37
        ]
      ],
      [
        [
          593.07,
          623.57
        ],
        [
          593.07,
          759.33
        ]
      ],
      [
        [
          457.3,
          759.33
        ],
        [
          457.3,
          623.57
        ]
      ],
      [
        [
          593.07,
          488.91
        ],
        [
          728.83,
          624.67
        ]
      ],
      [
        [
          725.46,
          244.91
        ],
        [
          589.7,
          380.67
        ]
      ],
      [
        [
          456.75,
          245.56
        ],
        [
          320.98,
          381.32
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
    "name": "V",
    "tip": "字母·七巧 · 七块板拼出大写 V",
    "outline": [
      [
        393.41,
        216.54
      ],
      [
        529.26,
        216.54
      ],
      [
        394.06,
        351.74
      ],
      [
        439.36,
        352.07
      ],
      [
        432.02,
        360.06
      ],
      [
        527.26,
        455.29
      ],
      [
        602.51,
        380.37
      ],
      [
        602.51,
        244.85
      ],
      [
        738.37,
        244.85
      ],
      [
        742.37,
        240.85
      ],
      [
        742.37,
        512.23
      ],
      [
        470.98,
        783.61
      ],
      [
        335.13,
        648.08
      ],
      [
        431.37,
        551.19
      ],
      [
        335.8,
        455.63
      ],
      [
        303.16,
        487.92
      ],
      [
        303.16,
        352.4
      ],
      [
        257.88,
        352.4
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 651.89,
        "y": 421.69,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 561.38,
        "y": 602.71,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 425.61,
        "y": 647.96,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "S",
        "x": 431.51,
        "y": 455.56,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 647.93,
        "y": 289.88,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 348.52,
        "y": 397.29,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "P",
        "x": 393.37,
        "y": 284.16,
        "angle": 135,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          742.4,
          512.2
        ],
        [
          470.87,
          512.2
        ]
      ],
      [
        [
          470.87,
          512.2
        ],
        [
          742.4,
          240.67
        ]
      ],
      [
        [
          470.87,
          783.72
        ],
        [
          470.87,
          512.2
        ]
      ],
      [
        [
          527.51,
          455.56
        ],
        [
          431.51,
          551.56
        ]
      ],
      [
        [
          335.51,
          455.56
        ],
        [
          431.51,
          359.56
        ]
      ],
      [
        [
          257.6,
          352.04
        ],
        [
          393.37,
          352.04
        ]
      ],
      [
        [
          470.87,
          512.2
        ],
        [
          470.87,
          783.73
        ]
      ],
      [
        [
          738.44,
          244.63
        ],
        [
          602.67,
          380.39
        ]
      ],
      [
        [
          303.26,
          352.04
        ],
        [
          439.03,
          352.04
        ]
      ],
      [
        [
          439.03,
          352.04
        ],
        [
          303.26,
          487.8
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
    "name": "W",
    "tip": "字母·七巧 · 七块板拼出大写 W",
    "outline": [
      [
        365.67,
        228.77
      ],
      [
        366,
        364.62
      ],
      [
        363.67,
        364.62
      ],
      [
        363.67,
        499.47
      ],
      [
        498.85,
        364.29
      ],
      [
        634.37,
        499.47
      ],
      [
        634.37,
        364.29
      ],
      [
        636.37,
        365.95
      ],
      [
        636.37,
        230.44
      ],
      [
        772.21,
        365.95
      ],
      [
        772.21,
        502.14
      ],
      [
        770.55,
        500.8
      ],
      [
        770.55,
        771.5
      ],
      [
        499.19,
        500.14
      ],
      [
        227.82,
        771.5
      ],
      [
        227.82,
        364.29
      ],
      [
        230.49,
        364.29
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 680.07,
        "y": 590.51,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 318.03,
        "y": 590.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 499.05,
        "y": 454.75,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 295.4,
        "y": 432.12,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 320.49,
        "y": 318.98,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 680.07,
        "y": 454.75,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "P",
        "x": 704.6,
        "y": 366.14,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          636.71,
          366.14
        ],
        [
          772.48,
          501.9
        ]
      ],
      [
        [
          227.52,
          364.24
        ],
        [
          363.29,
          364.24
        ]
      ],
      [
        [
          363.29,
          500
        ],
        [
          227.52,
          500
        ]
      ],
      [
        [
          365.74,
          364.23
        ],
        [
          229.98,
          364.23
        ]
      ],
      [
        [
          634.82,
          364.24
        ],
        [
          770.58,
          500
        ]
      ],
      [
        [
          770.58,
          500
        ],
        [
          634.82,
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
    "id": 34,
    "chapter": 2,
    "name": "X",
    "tip": "字母·七巧 · 七块板拼出大写 X",
    "outline": [
      [
        547.76,
        244.21
      ],
      [
        819.54,
        244.21
      ],
      [
        548.1,
        515.32
      ],
      [
        548.1,
        561.95
      ],
      [
        739.94,
        753.79
      ],
      [
        548.1,
        753.79
      ],
      [
        547.76,
        755.79
      ],
      [
        452.51,
        660.2
      ],
      [
        452.18,
        739.47
      ],
      [
        180.73,
        739.47
      ],
      [
        451.84,
        468.03
      ],
      [
        356.59,
        372.44
      ],
      [
        354.26,
        374.11
      ],
      [
        258.34,
        277.86
      ],
      [
        450.18,
        277.86
      ],
      [
        452.18,
        275.86
      ],
      [
        547.76,
        371.44
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 638.51,
        "y": 334.51,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 361.49,
        "y": 649.02,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 612,
        "y": 689.94,
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
        "y": 309.85,
        "angle": 0,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 516,
        "y": 660,
        "angle": 90,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 516,
        "angle": 90,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          548,
          515.53
        ],
        [
          548,
          244
        ]
      ],
      [
        [
          452,
          468
        ],
        [
          452,
          739.53
        ]
      ],
      [
        [
          548,
          372
        ],
        [
          452,
          468
        ]
      ],
      [
        [
          356,
          372
        ],
        [
          452,
          276
        ]
      ],
      [
        [
          548,
          753.94
        ],
        [
          548,
          561.94
        ]
      ],
      [
        [
          452,
          660
        ],
        [
          548,
          564
        ]
      ],
      [
        [
          548,
          564
        ],
        [
          548,
          372
        ]
      ],
      [
        [
          452,
          468
        ],
        [
          452,
          660
        ]
      ],
      [
        [
          450.15,
          277.85
        ],
        [
          354.15,
          373.85
        ]
      ],
      [
        [
          548,
          564
        ],
        [
          548,
          756
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
    "name": "Y",
    "tip": "字母·七巧 · 七块板拼出大写 Y",
    "outline": [
      [
        296.51,
        201.69
      ],
      [
        432.33,
        201.69
      ],
      [
        432.33,
        337.52
      ],
      [
        567.15,
        472.34
      ],
      [
        567.48,
        209.02
      ],
      [
        839.12,
        209.02
      ],
      [
        567.81,
        480.33
      ],
      [
        567.81,
        607.83
      ],
      [
        569.81,
        606.16
      ],
      [
        569.81,
        798.24
      ],
      [
        377.73,
        798.24
      ],
      [
        567.48,
        608.49
      ],
      [
        555.49,
        596.18
      ],
      [
        363.42,
        787.92
      ],
      [
        363.42,
        404.1
      ],
      [
        297.16,
        337.85
      ],
      [
        296.51,
        344.18
      ],
      [
        161.01,
        208.36
      ],
      [
        296.51,
        208.02
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 658.39,
        "y": 299.46,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 427.39,
        "y": 596.17,
        "angle": 270,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 505.91,
        "y": 734.63,
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
        "x": 251.1,
        "y": 253.28,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 386.86,
        "y": 382.39,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 472.9,
        "angle": 45,
        "flipped": true
      }
    ],
    "splitLines": [
      [
        [
          363.39,
          404.17
        ],
        [
          555.39,
          596.17
        ]
      ],
      [
        [
          432.12,
          337.13
        ],
        [
          432.12,
          472.9
        ]
      ],
      [
        [
          432.12,
          472.9
        ],
        [
          567.88,
          608.66
        ]
      ],
      [
        [
          432.12,
          337.13
        ],
        [
          296.35,
          337.13
        ]
      ],
      [
        [
          296.35,
          337.13
        ],
        [
          296.35,
          201.37
        ]
      ],
      [
        [
          296.35,
          208.03
        ],
        [
          296.35,
          343.79
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
    "name": "Z",
    "tip": "字母·七巧 · 七块板拼出大写 Z",
    "outline": [
      [
        431.99,
        228.75
      ],
      [
        567.85,
        228.75
      ],
      [
        567.85,
        230.42
      ],
      [
        839.23,
        230.42
      ],
      [
        567.85,
        501.8
      ],
      [
        567.19,
        500.47
      ],
      [
        432.66,
        635
      ],
      [
        567.52,
        635.33
      ],
      [
        567.52,
        630
      ],
      [
        703.71,
        630.33
      ],
      [
        567.85,
        765.52
      ],
      [
        567.85,
        771.51
      ],
      [
        431.99,
        771.51
      ],
      [
        431.99,
        767.19
      ],
      [
        160.95,
        767.19
      ],
      [
        431.99,
        495.8
      ],
      [
        432.66,
        499.47
      ],
      [
        567.19,
        364.94
      ],
      [
        296.47,
        364.61
      ]
    ],
    "solution": [
      {
        "id": "T1",
        "x": 341.61,
        "y": 676.95,
        "angle": 315,
        "flipped": false
      },
      {
        "id": "T2",
        "x": 658.39,
        "y": 320.69,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T3",
        "x": 432.12,
        "y": 318.98,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "S",
        "x": 500,
        "y": 703.65,
        "angle": 45,
        "flipped": false
      },
      {
        "id": "T4",
        "x": 613.14,
        "y": 675.46,
        "angle": 135,
        "flipped": false
      },
      {
        "id": "T5",
        "x": 522.63,
        "y": 273.73,
        "angle": 225,
        "flipped": false
      },
      {
        "id": "P",
        "x": 500,
        "y": 500,
        "angle": 135,
        "flipped": false
      }
    ],
    "splitLines": [
      [
        [
          432.12,
          495.93
        ],
        [
          432.12,
          767.46
        ]
      ],
      [
        [
          432.12,
          228.47
        ],
        [
          567.88,
          364.24
        ]
      ],
      [
        [
          567.88,
          364.24
        ],
        [
          567.88,
          500
        ]
      ],
      [
        [
          432.12,
          635.76
        ],
        [
          432.12,
          500
        ]
      ],
      [
        [
          567.88,
          635.76
        ],
        [
          567.88,
          771.53
        ]
      ],
      [
        [
          432.12,
          771.53
        ],
        [
          432.12,
          635.76
        ]
      ],
      [
        [
          567.88,
          765.97
        ],
        [
          567.88,
          630.2
        ]
      ],
      [
        [
          567.88,
          228.47
        ],
        [
          567.88,
          364.24
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
      chapNames: ["几何·入门","字母·A–J","字母·K–T","字母·U–Z"], chapTitles: ["几何","A–J","K–T","U–Z"],
      completeTitle: '七巧板全部完成', completeSub: '全部 36 关已通关',
      tray: DATA7.tray, snapGrid: DATA7.snapGrid }
  };
  root.TANGRAM_DATA.defaultSet = 'tangram4';
  root.TANGRAM_DATA.sets = root.TANGRAM_SETS;
})(typeof window !== 'undefined' ? window : globalThis);
/* ==== TANGRAM7_DATA_END ==== */
