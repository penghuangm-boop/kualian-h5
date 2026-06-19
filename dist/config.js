(function () {
  const CONFIG_STORAGE_KEY = "faceRescueAdminConfigV1";

  const typeAdvice = {
    posture: [
      ["phone", "手机抬高使用", "减少持续低头带来的姿态压缩感。"],
      ["reason", "30 秒靠墙站姿", "让头顶向上、肩颈回到舒展位置。"],
      ["advice", "测试 45° 高机位", "找到更适合自己的镜头高度。"]
    ],
    puff: [
      ["cold", "轻冷敷 3 分钟", "帮助晨间状态更清爽，不要过度冰敷。"],
      ["advice", "今天减少高盐饮食", "把调整放到下一餐，而不是临时补救。"],
      ["moon", "23:30 前准备入睡", "为第二天的上镜状态留出恢复时间。"]
    ],
    fatigue: [
      ["advice", "提亮眼下三角区", "把视觉重心向上移动，减少疲惫感。"],
      ["cold", "闭眼休息 5 分钟", "让眼周与表情先放松下来。"],
      ["moon", "今晚提前 30 分钟睡", "优先处理最直接的状态来源。"]
    ],
    camera: [
      ["advice", "镜头略高于视线", "减少低机位对下半脸的放大。"],
      ["reason", "寻找侧前方柔光", "避免顶光和下方光造成明显阴影。"],
      ["score", "记录最自然的角度", "保留一组以后可以直接复用的机位。"]
    ],
    makeup: [
      ["advice", "腮红位置上移", "把视觉重心拉回面中和眼下，减少下沉感。"],
      ["score", "提亮眼下三角区", "让面中更干净，照片里会更有精神。"],
      ["reason", "发型露出下颌线", "避免发丝压住脸侧，让轮廓更清爽。"]
    ],
    contour: [
      ["phone", "先做肩颈舒展", "让下颌线和颈部线条不要被姿态压住。"],
      ["cold", "短时轻冷敷", "帮助下半脸和面中状态更清爽。"],
      ["advice", "测试侧前方柔光", "用光线保留轮廓，不靠重滤镜修饰。"]
    ]
  };

  const typePlans = {
    posture: [
      ["姿态启动日", ["手机抬高", "靠墙站姿", "测试高机位"]],
      ["肩颈舒展日", ["肩颈拉伸", "下巴微收", "减少低头刷手机"]],
      ["镜头纠偏日", ["找到 45° 角度", "镜头高于视线", "记录好看机位"]],
      ["轮廓稳定日", ["侧前方柔光", "发型露出脸侧", "避免低机位"]],
      ["妆造提气日", ["眼下提亮", "腮红上移", "保持颅顶蓬松"]],
      ["场景预演日", ["模拟拍摄", "保留有效动作", "减少临时用力"]],
      ["复盘巩固日", ["同角度对比", "固定 3 个动作", "形成维护清单"]]
    ],
    puff: [
      ["消肿启动日", ["温水补充", "轻冷敷", "早餐少盐"]],
      ["饮食观察日", ["晚餐清淡", "减少高盐零食", "记录晨间状态"]],
      ["作息恢复日", ["提前入睡", "睡前少刷手机", "醒后轻活动"]],
      ["光线友好日", ["避开顶光", "选择柔光", "下午再拍对比"]],
      ["妆前清爽日", ["眼下轻提亮", "减少厚重底妆", "保持轮廓干净"]],
      ["场景预演日", ["固定拍摄时间", "测试侧前方光", "保留有效角度"]],
      ["复盘巩固日", ["比较早晚差异", "保留少盐习惯", "形成晨间清单"]]
    ],
    fatigue: [
      ["恢复启动日", ["闭眼休息", "眼下提亮", "今晚早睡"]],
      ["眼周放松日", ["减少久盯屏幕", "轻热敷", "表情放松"]],
      ["面中提亮日", ["妆前保湿", "提亮三角区", "避开顶光"]],
      ["精神感训练日", ["自然微笑", "眼神稳定", "颈肩舒展"]],
      ["作息修复日", ["提前 30 分钟睡", "减少夜间饮食", "睡前离屏"]],
      ["上镜预演日", ["测试柔光", "固定角度", "拍 3 张对比"]],
      ["复盘巩固日", ["记录最有效动作", "保留早睡提醒", "形成恢复清单"]]
    ],
    camera: [
      ["角度启动日", ["镜头略高", "避开低机位", "测试侧前方角度"]],
      ["光线优化日", ["寻找柔光", "避开顶光", "减少强阴影"]],
      ["表情稳定日", ["嘴角轻提", "眼神看镜头上方", "避免夸张表情"]],
      ["构图训练日", ["留出头顶空间", "脸侧保留轮廓", "避免近距离广角"]],
      ["滤镜控制日", ["关闭重滤镜", "保留真实肤色", "少用锐化"]],
      ["场景预演日", ["模拟重要场景", "保存机位参数", "拍摄 3 组对比"]],
      ["复盘巩固日", ["挑出最佳角度", "保存光线条件", "形成拍摄模板"]]
    ],
    makeup: [
      ["妆造启动日", ["腮红上移", "面中提亮", "发型露出脸侧"]],
      ["底妆清爽日", ["减少厚重遮瑕", "眼下轻提亮", "保持肤色干净"]],
      ["视觉重心日", ["高位腮红", "眉眼加强", "避免低位修容"]],
      ["发型调整日", ["增加颅顶蓬松", "脸侧保留空气感", "避免贴脸披发"]],
      ["拍照适配日", ["测试妆后光线", "记录有效色彩", "少用重滤镜"]],
      ["场景预演日", ["按场景完成妆造", "拍同角度对比", "记录有效组合"]],
      ["复盘巩固日", ["保留 3 个妆造动作", "整理上镜清单", "形成固定模板"]]
    ],
    contour: [
      ["轮廓启动日", ["肩颈舒展", "轻冷敷", "侧前方柔光"]],
      ["下颌线管理日", ["下巴微收", "头顶向上", "避免低机位"]],
      ["面中支撑日", ["面中提亮", "减少暗沉底妆", "腮红略高"]],
      ["水肿观察日", ["晚餐少盐", "睡前少饮酒", "记录晨间轮廓"]],
      ["拍摄稳定日", ["固定 45° 角度", "镜头高于视线", "保留脸侧光"]],
      ["场景预演日", ["同角度对比", "避免贴脸发型", "记录最佳机位"]],
      ["复盘巩固日", ["保留轮廓动作", "整理饮食观察", "形成维护清单"]]
    ]
  };

  const collapseTypeParams = [
    {
      id: "posture",
      name: "姿态疲惫型",
      threshold: 60,
      level: "轻度 · 建议调整",
      priority: "姿态优先",
      adviceKey: "posture",
      desc: "低头、颈前伸、低机位和肩颈紧张共同导致上镜显累。",
      weights: { 作息: 12, 姿态: 42, 拍照: 28, 妆造: 8, 水肿: 10 },
      factors: [
        ["头颈姿态容易前倾", "持续低头会让镜头里的下颌和颈部线条更紧凑。"],
        ["手机视线位置偏低", "长时间向下看会让上镜状态显得更疲惫。"],
        ["低机位放大下半脸", "机位偏低时，下半脸会成为画面里的视觉重心。"]
      ],
      advice: typeAdvice.posture,
      plan: typePlans.posture,
      metrics: { "轮廓清爽感": 48, "姿态舒展度": 44, "上镜精神感": 66, "拍摄稳定度": 58 }
    },
    {
      id: "puff",
      name: "晨间浮肿型",
      threshold: 58,
      level: "轻度 · 建议观察",
      priority: "消肿优先",
      adviceKey: "puff",
      desc: "晨起、熬夜、晚餐偏咸或饮水节奏不稳时更容易显肿显垮。",
      weights: { 作息: 30, 姿态: 8, 拍照: 8, 妆造: 10, 水肿: 44 },
      factors: [
        ["晚餐与盐分影响", "前一晚饮食会直接影响第二天早上的清爽感。"],
        ["睡眠恢复不足", "晚睡或睡眠偏少时，晨间状态更容易显疲惫。"],
        ["晨间状态波动", "刚起床与下午的上镜状态可能有明显差异。"]
      ],
      advice: typeAdvice.puff,
      plan: typePlans.puff,
      metrics: { "晨间清爽感": 43, "状态稳定度": 51, "上镜精神感": 63, "作息恢复度": 47 }
    },
    {
      id: "fatigue",
      name: "作息疲惫型",
      threshold: 62,
      level: "中度 · 优先恢复",
      priority: "恢复优先",
      adviceKey: "fatigue",
      desc: "睡眠不足、眼周疲惫、面中暗沉导致整体精神感下降。",
      weights: { 作息: 46, 姿态: 12, 拍照: 10, 妆造: 18, 水肿: 14 },
      factors: [
        ["睡眠时间偏少", "休息不足会优先体现在眼周与整体精神感。"],
        ["表情肌持续紧张", "长时间工作后，表情容易变得僵硬和下沉。"],
        ["面中亮度不足", "顶光或暗光会进一步放大眼下阴影。"]
      ],
      advice: typeAdvice.fatigue,
      plan: typePlans.fatigue,
      metrics: { "眼周精神感": 45, "状态恢复度": 49, "上镜精神感": 54, "光线友好度": 61 }
    },
    {
      id: "camera",
      name: "镜头显老型",
      threshold: 56,
      level: "轻度 · 角度优化",
      priority: "拍摄优先",
      adviceKey: "camera",
      desc: "低机位、顶光、重滤镜或不稳定表情会放大下半脸问题。",
      weights: { 作息: 10, 姿态: 18, 拍照: 46, 妆造: 16, 水肿: 10 },
      factors: [
        ["机位高度偏低", "镜头低于视线时，下半脸更容易显得沉重。"],
        ["正面硬光较多", "强光与顶光会放大眼下和面部阴影。"],
        ["缺少固定上镜角度", "每次临时找角度，会让照片状态不稳定。"]
      ],
      advice: typeAdvice.camera,
      plan: typePlans.camera,
      metrics: { "角度友好度": 42, "光线适配度": 57, "上镜精神感": 64, "画面稳定度": 46 }
    },
    {
      id: "makeup",
      name: "妆造下沉型",
      threshold: 54,
      level: "轻度 · 妆造调整",
      priority: "妆造优先",
      adviceKey: "makeup",
      desc: "腮红位置偏低、发型压脸、底妆暗沉会让视觉重心下移。",
      weights: { 作息: 10, 姿态: 12, 拍照: 16, 妆造: 50, 水肿: 12 },
      factors: [
        ["视觉重心偏低", "腮红、阴影或发型位置偏低时，脸会显得更沉。"],
        ["底妆亮度不足", "面中和眼下不够干净，会削弱上镜精神感。"],
        ["发型压住轮廓", "披发或贴头皮会让脸部边界更不清爽。"]
      ],
      advice: typeAdvice.makeup,
      plan: typePlans.makeup,
      metrics: { "妆造提气感": 46, "面中明亮度": 52, "轮廓清爽感": 55, "上镜精神感": 59 }
    },
    {
      id: "contour",
      name: "轮廓松弛型",
      threshold: 64,
      level: "中度 · 轮廓管理",
      priority: "轮廓优先",
      adviceKey: "contour",
      desc: "下颌线模糊、面中支撑弱、嘴角趋势下垂时进入轮廓管理路径。",
      weights: { 作息: 16, 姿态: 24, 拍照: 18, 妆造: 12, 水肿: 30 },
      factors: [
        ["下颌线边界不清", "下半脸边界模糊会让照片里的脸更容易显沉。"],
        ["面中支撑感偏弱", "面中亮度与轮廓支撑不足时，视觉重心会下移。"],
        ["水肿与姿态叠加", "轻微浮肿叠加低头，会明显影响轮廓清爽感。"]
      ],
      advice: typeAdvice.contour,
      plan: typePlans.contour,
      metrics: { "轮廓清爽感": 41, "下颌线稳定度": 45, "面中支撑感": 49, "状态恢复度": 55 }
    }
  ];

  const reportRules = collapseTypeParams.map((type) => [type.name, type.desc, "启用中"]);

  const photoRules = [
    ["光线质量", "检查亮度是否过暗或明显过曝。", "粗略"],
    ["清晰度", "检查图片边缘变化，判断是否过糊。", "粗略"],
    ["图片尺寸", "检查分辨率是否足够用于报告辅助。", "粗略"],
    ["隐私限制", "不识别身份，不做人脸建档，不上传服务器。", "强制"]
  ];

  const flowSwitches = [
    ["第 10 题后进入照片页", "问卷完成后先展示照片辅助页，再登录查看报告。", true],
    ["未登录查看报告弹登录", "报告页前置登录弹窗，登录后进入个人报告。", true],
    ["照片辅助可跳过", "用户可以暂不上传，查看问卷版报告。", true],
    ["7 天打卡本地保存", "MVP 阶段用 localStorage 保存进度。", true]
  ];

  const questionBank = [
    {
      id: "q1",
      group: "核心痛点",
      enabled: true,
      question: "你觉得自己最明显的困扰是什么？",
      options: [
        { label: "法令纹明显", type: "fatigue", image: "face-lines.png" },
        { label: "下颌线模糊", type: "posture", image: "face-jaw.png" },
        { label: "面中凹陷", type: "fatigue", image: "face-mid.png" },
        { label: "嘴角下垂", type: "fatigue", image: "face-mouth.png" },
        { label: "早晚都浮肿", type: "puff", image: "face-puff.png" },
        { label: "拍照显老", type: "camera", image: "face-photo.png" }
      ]
    },
    {
      id: "q2",
      group: "触发场景",
      enabled: true,
      question: "你通常什么时候觉得脸更垮？",
      options: [
        { label: "早上起床", type: "puff", image: "face-puff.png" },
        { label: "晚上下班", type: "fatigue", image: "face-mid.png" },
        { label: "拍照时", type: "camera", image: "face-photo.png" },
        { label: "视频通话", type: "camera", image: "face-jaw.png" },
        { label: "吃咸之后", type: "puff", image: "face-puff.png" },
        { label: "熬夜之后", type: "fatigue", image: "face-lines.png" }
      ]
    },
    {
      id: "q3",
      group: "改善目标",
      enabled: true,
      question: "你想先改善什么？",
      options: [
        { label: "当天状态", type: "fatigue", image: "face-mid.png" },
        { label: "下颌线", type: "posture", image: "face-jaw.png" },
        { label: "妆造问题", type: "camera", image: "face-mouth.png" },
        { label: "拍照角度", type: "camera", image: "face-photo.png" },
        { label: "作息水肿", type: "puff", image: "face-puff.png" },
        { label: "精神感", type: "fatigue", image: "face-lines.png" }
      ]
    },
    {
      id: "q4",
      group: "使用场景",
      enabled: true,
      question: "你的上镜场景？",
      options: [
        { label: "自拍", type: "camera", image: "face-photo.png" },
        { label: "短视频", type: "camera", image: "face-jaw.png" },
        { label: "面试", type: "posture", image: "face-mid.png" },
        { label: "约会聚会", type: "fatigue", image: "face-mouth.png" },
        { label: "证件照", type: "camera", image: "face-photo.png" },
        { label: "旅行拍照", type: "camera", image: "face-photo.png" }
      ]
    },
    {
      id: "q5",
      group: "行动偏好",
      enabled: true,
      question: "能接受的方式？",
      options: [
        { label: "冷敷消肿", type: "puff", image: "face-puff.png" },
        { label: "按摩护理", type: "puff", image: "face-jaw.png" },
        { label: "妆容修饰", type: "camera", image: "face-mouth.png" },
        { label: "姿态训练", type: "posture", image: "face-jaw.png" },
        { label: "每日打卡", type: "balanced", image: "face-mid.png" },
        { label: "状态记录", type: "balanced", image: "face-photo.png" }
      ]
    },
    {
      id: "q6",
      group: "作息状态",
      enabled: true,
      question: "最近作息？",
      options: [
        { label: "经常熬夜", type: "fatigue", image: "face-lines.png" },
        { label: "睡眠不足", type: "fatigue", image: "face-mid.png" },
        { label: "还算规律", type: "balanced", image: "face-mouth.png" },
        { label: "睡前刷手机", type: "posture", image: "face-jaw.png" },
        { label: "偶尔饮酒", type: "puff", image: "face-puff.png" },
        { label: "饮水偏少", type: "fatigue", image: "face-lines.png" }
      ]
    },
    {
      id: "q7",
      group: "姿态因素",
      enabled: true,
      question: "颈肩状态？",
      options: [
        { label: "长期低头", type: "posture", image: "face-jaw.png" },
        { label: "久坐办公", type: "posture", image: "face-jaw.png" },
        { label: "有颈前伸", type: "posture", image: "face-jaw.png" },
        { label: "肩颈紧张", type: "posture", image: "face-mid.png" },
        { label: "状态正常", type: "balanced", image: "face-mouth.png" },
        { label: "不太确定", type: "balanced", image: "face-photo.png" }
      ]
    },
    {
      id: "q8",
      group: "拍摄因素",
      enabled: true,
      question: "拍照习惯？",
      options: [
        { label: "低机位", type: "camera", image: "face-jaw.png" },
        { label: "正脸多", type: "camera", image: "face-lines.png" },
        { label: "侧脸多", type: "balanced", image: "face-jaw.png" },
        { label: "开重滤镜", type: "camera", image: "face-photo.png" },
        { label: "不太会拍", type: "camera", image: "face-photo.png" },
        { label: "经常视频", type: "posture", image: "face-mid.png" }
      ]
    },
    {
      id: "q9",
      group: "妆造因素",
      enabled: true,
      question: "妆造习惯？",
      options: [
        { label: "很少化妆", type: "fatigue", image: "face-lines.png" },
        { label: "底妆为主", type: "balanced", image: "face-mid.png" },
        { label: "腮红低位", type: "fatigue", image: "face-mouth.png" },
        { label: "喜欢披发", type: "camera", image: "face-photo.png" },
        { label: "常扎头发", type: "balanced", image: "face-jaw.png" },
        { label: "不确定", type: "balanced", image: "face-photo.png" }
      ]
    },
    {
      id: "q10",
      group: "转化意愿",
      enabled: true,
      question: "是否想获得 7 天方案？",
      options: [
        { label: "想系统改善", type: "balanced", image: "face-mid.png" },
        { label: "先看报告", type: "balanced", image: "face-photo.png" },
        { label: "有重要场合", type: "camera", image: "face-lines.png" },
        { label: "想打卡", type: "balanced", image: "face-mouth.png" },
        { label: "想看对比", type: "camera", image: "face-photo.png" },
        { label: "暂不确定", type: "balanced", image: "face-jaw.png" }
      ]
    }
  ];

  const defaultConfig = {
    version: "admin-config-20260617-1",
    dimensions: ["作息", "姿态", "拍照", "妆造", "水肿"],
    answerTypeDimensions: {
      fatigue: "作息",
      posture: "姿态",
      camera: "拍照",
      balanced: "妆造",
      puff: "水肿"
    },
    collapseTypeParams,
    questionBank,
    reportRules,
    photoRules,
    flowSwitches
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTypes(savedTypes) {
    const savedList = Array.isArray(savedTypes) ? savedTypes : [];
    return defaultConfig.collapseTypeParams.map((baseType) => {
      const saved = savedList.find((item) => item && item.id === baseType.id) || {};
      return {
        ...clone(baseType),
        ...saved,
        id: baseType.id,
        name: saved.name || baseType.name,
        priority: saved.priority || baseType.priority,
        adviceKey: saved.adviceKey || baseType.adviceKey,
        desc: saved.desc || baseType.desc,
        threshold: Number.isFinite(Number(saved.threshold)) ? Number(saved.threshold) : baseType.threshold,
        level: saved.level || baseType.level,
        weights: { ...baseType.weights, ...(saved.weights || {}) },
        factors: Array.isArray(saved.factors) && saved.factors.length ? saved.factors : clone(baseType.factors),
        advice: Array.isArray(saved.advice) && saved.advice.length ? saved.advice : clone(baseType.advice),
        plan: Array.isArray(saved.plan) && saved.plan.length ? saved.plan : clone(baseType.plan),
        metrics: saved.metrics && typeof saved.metrics === "object" ? { ...baseType.metrics, ...saved.metrics } : clone(baseType.metrics)
      };
    });
  }

  function normalizeQuestionBank(savedQuestions) {
    const savedList = Array.isArray(savedQuestions) ? savedQuestions : [];
    return defaultConfig.questionBank.map((baseQuestion, index) => {
      const saved = savedList.find((item) => item && item.id === baseQuestion.id) || {};
      const savedOptions = Array.isArray(saved.options) ? saved.options : [];
      const options = baseQuestion.options.map((baseOption, optionIndex) => {
        const savedOption = savedOptions[optionIndex] || {};
        return {
          label: savedOption.label || baseOption.label,
          type: savedOption.type || baseOption.type,
          image: savedOption.image || baseOption.image
        };
      });
      return {
        id: baseQuestion.id,
        group: saved.group || baseQuestion.group,
        enabled: saved.enabled !== false,
        order: Number.isFinite(Number(saved.order)) ? Number(saved.order) : index + 1,
        question: saved.question || baseQuestion.question,
        options
      };
    }).sort((a, b) => a.order - b.order);
  }

  function normalizeConfig(savedConfig = {}) {
    const normalizedTypes = normalizeTypes(savedConfig.collapseTypeParams);
    return {
      ...clone(defaultConfig),
      ...savedConfig,
      dimensions: clone(defaultConfig.dimensions),
      answerTypeDimensions: { ...defaultConfig.answerTypeDimensions, ...(savedConfig.answerTypeDimensions || {}) },
      collapseTypeParams: normalizedTypes,
      questionBank: normalizeQuestionBank(savedConfig.questionBank),
      reportRules: normalizedTypes.map((type) => [type.name, type.desc, "启用中"]),
      photoRules: Array.isArray(savedConfig.photoRules) ? savedConfig.photoRules : clone(defaultConfig.photoRules),
      flowSwitches: Array.isArray(savedConfig.flowSwitches) ? savedConfig.flowSwitches : clone(defaultConfig.flowSwitches)
    };
  }

  function readKuailianAdminConfig() {
    let savedConfig = {};
    try {
      savedConfig = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}");
    } catch {
      savedConfig = {};
    }
    return normalizeConfig(savedConfig);
  }

  function writeKuailianAdminConfig(config) {
    const normalized = normalizeConfig(config);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  window.KUAILIAN_CONFIG_STORAGE_KEY = CONFIG_STORAGE_KEY;
  window.KUAILIAN_DEFAULT_ADMIN_CONFIG = clone(defaultConfig);
  window.readKuailianAdminConfig = readKuailianAdminConfig;
  window.writeKuailianAdminConfig = writeKuailianAdminConfig;
})();
