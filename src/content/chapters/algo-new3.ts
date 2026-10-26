import type { Chapter } from '../../types';

/* ============================================================
 *  《算法与数据结构》第 5~6 章：树与二叉搜索树、堆与优先队列
 * ============================================================ */

export const algoExtra3: Omit<Chapter, 'courseId' | 'order'>[] = [
{
  "id": "algo-5",
  "title": "树与二叉搜索树",
  "goal": "掌握二叉树的递归本质与四大遍历方式（前/中/后/层序），深刻理解二叉搜索树（BST）的有序性与动态维护，熟练运用树形递归解决最近公共祖先（LCA）与深度计算等高频面试与工程问题。",
  "lessons": [
    {
      "id": "algo-l-5-1",
      "title": "二叉树的递归本质与四大遍历方式",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 用「根节点 + 左子树 + 右子树」的递归定义解释二叉树，画出前序、中序、后序与层序遍历的访问轨迹；\n2. 独立手写前序/中序/后序递归遍历模板，并能利用 \\`collections.deque\\` 实现基于队列的 BFS 层序遍历；\n3. 说出给定中序遍历与前序（或后序）遍历唯一重构二叉树的数学原理与代码实现。\n\n### 前置知识\n\n- 「递归与递推式」（algo-l-1-3）；\n- 「栈与队列」（algo-l-3-2）。\n\n### 问题背景\n\n现实世界中的数据往往具有天然的层级关系：文件目录系统、DOM 树结构、编译器的抽象语法树（AST）、数据库索引 B+ 树等。二叉树是所有高级树形结构（BST、红黑树、B 树、字典树）的基石。在算法面试与工程中，树是考察「递归思维」与「分治思想」的核心试金石。\n\n### 直觉理解\n\n把二叉树的遍历想象成一次「全家拜访」：\n- **前序遍历（根-左-右）**：领导先讲话，再安排部门经理，最后基层执行。适合做树的序列化、拷贝整棵树；\n- **中序遍历（左-根-右）**：按座位从左到右依次起立。在二叉搜索树中，中序遍历恰好能从小到大输出所有有序数值；\n- **后序遍历（左-右-根）**：必须先听取左右两个子部门的汇报，领导才能综合拍板。适合计算目录总大小、自底向上计算树深度或销毁释放子节点；\n- **层序遍历（BFS）**：雷达波纹一圈一圈向外扩散。适合求两个节点的最短距离、按层输出报表。\n\n### 核心概念与原理详解\n\n## 1. 二叉树的递归数据结构\n\n二叉树不存在前驱后继的单一线性关系，每个节点最多拥有两个子节点：\n\n```python\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n```\n\n## 2. 深度优先遍历（DFS）：前中后序的统一本质\n\n三种 DFS 遍历在底层递归调用栈上的访问顺序完全相同——每个节点都会经历三次停留：\n1. 刚进入节点时（前序位置）；\n2. 左子树递归返回、准备进入右子树时（中序位置）；\n3. 右子树递归返回、准备向上返回父节点时（后序位置）。\n\n差异仅仅在于**你在哪一个停留点收集处理节点的值**。\n\n## 3. 广度优先遍历（BFS）：层序遍历\n\n使用双端队列（Queue），按照“入队根节点 → 弹出当前层所有节点并处理 → 将其左右子节点依次入队”的循环进行，时间复杂度为 $O(N)$，空间复杂度取决于树的最大宽度（最差 $O(N)$）。\n\n### 完整案例（含手算与推导）\n\n考察树结构：\n```\n       1\n      / \\\n     2   3\n    / \\\n   4   5\n```\n- 前序（根左右）：`[1, 2, 4, 5, 3]`\n- 中序（左根右）：`[4, 2, 5, 1, 3]`\n- 后序（左右根）：`[4, 5, 2, 3, 1]`\n- 层序（自顶向下）：`[[1], [2, 3], [4, 5]]`\n\n### 代码实践\n\n```python\nfrom collections import deque\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# 1. 递归三序遍历\ndef get_traversals(root):\n    pre, ino, post = [], [], []\n    def dfs(node):\n        if not node:\n            return\n        pre.append(node.val)      # 前序位置\n        dfs(node.left)\n        ino.append(node.val)      # 中序位置\n        dfs(node.right)\n        post.append(node.val)     # 后序位置\n    dfs(root)\n    return pre, ino, post\n\n# 2. 队列层序遍历（按层分组）\ndef level_order(root):\n    if not root:\n        return []\n    res = []\n    q = deque([root])\n    while q:\n        level_size = len(q)\n        current_level = []\n        for _ in range(level_size):\n            node = q.popleft()\n            current_level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(current_level)\n    return res\n```\n\n### 常见陷阱与避坑指南\n\n1. **递归基遗漏**：递归必须以 `if not node: return` 结尾，否则必定触发 `RecursionError` 或 `AttributeError: 'NoneType' object has no attribute 'left'`。\n2. **层序遍历未固定当前层大小**：在 `while q:` 内部必须预先记录 `level_size = len(q)`，不能在循环内动态改变，否则同层节点与下一层子节点会混淆。\n\n### 知识关联与小结\n\n- **与栈的关系**：递归 DFS 本质是系统调用栈在执行回溯，可用显式自定义 `stack` 改写为迭代遍历；\n- **与图的关系**：树是一种**无环连通无向图**，树的遍历是图 DFS/BFS 的特化与简化形式。\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 10.4 节：有根树的表示；第 12 章：二叉搜索树遍历；\n- MIT 6.006 Lecture 6: Binary Trees and Traversals。",
      "tips": [
        {
          "kind": "pitfall",
          "text": "注意：仅凭前序和后序遍历无法唯一还原二叉树！必须包含中序遍历，或者二叉树是满二叉树，才能唯一重构。"
        },
        {
          "kind": "interview",
          "text": "面试高频：请用迭代（非递归）显式栈实现二叉树中序遍历。核心思路是一路向左压栈到底，弹出时访问并转向右子节点。"
        },
        {
          "kind": "performance",
          "text": "Python 默认最大递归深度为 1000。处理退化为单链表的倾斜二叉树时，需使用 sys.setrecursionlimit 或改用迭代方式。"
        }
      ],
      "demos": [
        {
          "title": "二叉树四种遍历全流程演示",
          "lang": "python",
          "code": "from collections import deque\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# 构建示例树:   1\n#             / \\\n#            2   3\n#           / \\\n#          4   5\nroot = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))\n\n# 遍历验证\ndef inorder(node):\n    return inorder(node.left) + [node.val] + inorder(node.right) if node else []\n\ndef preorder(node):\n    return [node.val] + preorder(node.left) + preorder(node.right) if node else []\n\ndef postorder(node):\n    return postorder(node.left) + postorder(node.right) + [node.val] if node else []\n\nprint(\"前序遍历:\", preorder(root))\nprint(\"中序遍历:\", inorder(root))\nprint(\"后序遍历:\", postorder(root))"
        }
      ]
    },
    {
      "id": "algo-l-5-2",
      "title": "二叉搜索树（BST）原理与动态维护",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 准确陈述二叉搜索树（BST）的左小右大不变式，证明其中序遍历必然严格单调递增；\n2. 实现 BST 的查找、插入与删除（重点掌握度为 2 节点的后继节点替换法）；\n3. 识别 BST 验证中的「只看父子不看祖先」典型错误，写出带上下界参数的合法性验证算法。\n\n### 前置知识\n\n- 「二叉树的递归本质与四大遍历方式」（algo-l-5-1）；\n- 「二分查找」（algo-l-2-3）。\n\n### 问题背景\n\n普通二叉树查找目标值需要全树遍历，耗时 $O(N)$。如果给每个节点增加一个简单的保序约束——「左子树所有节点值严格小于根，右子树所有节点值严格大于根」，我们就得到了二叉搜索树（Binary Search Tree, BST）。在理想平衡状态下，BST 每次比较都能砍掉一半搜索空间，将检索、插入和删除的复杂度压缩到 $O(\\log N)$。\n\n### 直觉理解\n\nBST 就是把**二分查找的决策树物化为指针结构**：\n- 找 target 时：比当前大就往右走，比当前小就往左走，等同于二分查找；\n- 插入新值时：沿着查找失败的路径一直走到叶子空位，挂上去即可；\n- 删除节点时：如果节点有两个孩子，就像部门经理离职，不能直接撤销部门，而是必须让**直接下属中最优秀的骨干（右子树中的最小值，即中序后继）**上来接替位置，保证秩序不乱。\n\n### 核心概念与原理详解\n\n## 1. BST 的严格定义与性质\n\n对于任意节点 $X$：\n- 若左子树非空，则左子树上**所有**节点的值均 $< X.val$；\n- 若右子树非空，则右子树上**所有**节点的值均 $> X.val$；\n- 其左右子树本身也必须是二叉搜索树。\n\n**重要推论**：对 BST 执行中序遍历，输出的序列必然是**严格升序排列**的。\n\n## 2. 验证合法 BST 的常见陷阱\n\n❌ **错误写法**：仅判断 `node.left.val < node.val and node.right.val > node.val`。\n- 反例：根节点为 10，右孩子为 15，右孩子的左孙子为 6。对于 15 来说 6 < 15 满足局部关系，但 6 < 10 违反了 10 的右子树必须全部大于 10 的全局约束！\n- **正确思路**：必须将祖先施加的有效取值区间 $(low, high)$ 作为参数向下透传，递归验证。\n\n## 3. BST 删除节点（三种情况）\n\n1. **叶子节点**（无孩子）：直接删除（父节点指针置空）；\n2. **只有一个孩子**：让孩子直接替代被删除节点；\n3. **有两个孩子**：在右子树中找到最小值节点（中序后继 `successor`），将其值拷贝给当前节点，然后在右子树中递归删除该后继节点。\n\n### 代码实践\n\n```python\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# 1. 验证 BST 合法性（上下界约束法）\ndef is_valid_bst(root):\n    def dfs(node, low, high):\n        if not node:\n            return True\n        if not (low < node.val < high):\n            return False\n        return dfs(node.left, low, node.val) and dfs(node.right, node.val, high)\n    return dfs(root, float('-inf'), float('inf'))\n\n# 2. 插入新节点\ndef insert_into_bst(root, val):\n    if not root:\n        return TreeNode(val)\n    if val < root.val:\n        root.left = insert_into_bst(root.left, val)\n    elif val > root.val:\n        root.right = insert_into_bst(root.right, val)\n    return root\n\n# 3. 删除节点\ndef delete_node(root, key):\n    if not root:\n        return None\n    if key < root.val:\n        root.left = delete_node(root.left, key)\n    elif key > root.val:\n        root.right = delete_node(root.right, key)\n    else:\n        # 情况 1 & 2: 0 个或 1 个孩子\n        if not root.left: return root.right\n        if not root.right: return root.left\n        # 情况 3: 2 个孩子，寻找右子树最小值\n        successor = root.right\n        while successor.left:\n            successor = successor.left\n        root.val = successor.val\n        root.right = delete_node(root.right, successor.val)\n    return root\n```\n\n### 常见陷阱与避坑指南\n\n1. **退化为链表**：如果按升序序列 `[1, 2, 3, 4, 5]` 连续插入 BST，树会退化成一条向右倾斜的单链表，查找时间从 $O(\\log N)$ 骤降为 $O(N)$。为了解决这个问题，工业界发展出了**平衡二叉树（AVL 树、红黑树）**，通过旋转操作维持树高度平衡。\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 12 章：二叉搜索树（查找、插入、删除与定理 12.1）；\n- Sedgewick & Wayne 《Algorithms》 第 3.2 节：Binary Search Trees。",
      "tips": [
        {
          "kind": "interview",
          "text": "面试题：求 BST 中第 k 小的元素。中序遍历 BST 时维护计数器 count，访问到第 k 个节点时即为答案，时间复杂度 O(H + k)。"
        },
        {
          "kind": "performance",
          "text": "BST 的操作效率完全取决于树高 H。平衡树 H = O(log N)，退化单链表 H = O(N)。工程中高频使用红黑树（如 Java TreeMap、C++ std::map）。"
        }
      ],
      "demos": [
        {
          "title": "BST 动态插入与中序有序性验证",
          "lang": "python",
          "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef insert(root, val):\n    if not root: return TreeNode(val)\n    if val < root.val: root.left = insert(root.left, val)\n    else: root.right = insert(root.right, val)\n    return root\n\n# 连续插入乱序数字\nnums = [5, 3, 7, 2, 4, 6, 8]\nroot = None\nfor x in nums:\n    root = insert(root, x)\n\n# 中序遍历验证是否有序\ndef inorder(node):\n    return inorder(node.left) + [node.val] + inorder(node.right) if node else []\n\nprint(\"乱序插入:\", nums)\nprint(\"中序遍历输出（自然升序）:\", inorder(root))"
        }
      ]
    },
    {
      "id": "algo-l-5-3",
      "title": "树形递归高频模型与最近公共祖先（LCA）",
      "difficulty": 4,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 掌握树形动态规划与后序分治模式（子问题结果向上汇总）；\n2. 独立写出计算二叉树最大深度、直径与判断平衡二叉树的算法；\n3. 理解并推导二叉树最近公共祖先（Lowest Common Ancestor, LCA）的递归逻辑。\n\n### 前置知识\n\n- 「二叉树的递归本质与四大遍历方式」（algo-l-5-1）；\n- 「二叉搜索树（BST）原理与动态维护」（algo-l-5-2）。\n\n### 问题背景\n\n二叉树的大量难题本质上都可以归结为**树形后序递归**：向左子树要一个答案，向右子树要一个答案，然后站在当前根节点把两个答案合并成当前树的答案并返回给父节点。最近公共祖先（LCA）是其中最经典的代表，广泛应用于企业组织架构祖先查询、Git 提交分支合并基点（Merge Base）计算等现实场景。\n\n### 直觉理解\n\n求最近公共祖先就像在公司组织树里找两位员工的「共同主管」：\n- 如果两个人在同一个部门（都在左子树），那共同主管肯定也在左子树；\n- 如果两个人在不同的部门（一个在左子树，一个在右子树），那他们所在部门的共同大领导必定是当前的「根部门主管」；\n- 如果自己就是其中一个员工，且另一个员工在自己的下属团队中，那共同主管就是自己。\n\n### 核心概念与原理详解\n\n## 最近公共祖先（LCA）递归定义\n\n定义函数 \\`lowest_common_ancestor(root, p, q)\\`：\n- 若 \\`root\\` 为空，返回 \\`None\\`；\n- 若 \\`root == p\\` 或 \\`root == q\\`，说明找到了目标之一，直接返回 \\`root\\`；\n- 递归向左子树询问：\\`left = lowest_common_ancestor(root.left, p, q)\\`；\n- 递归向右子树询问：\\`right = lowest_common_ancestor(root.right, p, q)\\`；\n- **合并决策**：\n  1. 若 \\`left\\` 和 \\`right\\` 均非空：说明 $p$ 和 $q$ 分列于当前节点两侧，当前 \\`root\\` 即为最近公共祖先！\n  2. 若只有一侧非空：说明两个目标都在非空那一侧，直接返回那个非空的指针；\n  3. 若两侧均为空：返回 \\`None\\`。\n\n### 代码实践\n\n```python\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# 1. 最近公共祖先 (LCA)\ndef lowest_common_ancestor(root, p, q):\n    if not root or root == p or root == q:\n        return root\n    left = lowest_common_ancestor(root.left, p, q)\n    right = lowest_common_ancestor(root.right, p, q)\n    if left and right:\n        return root\n    return left if left else right\n\n# 2. 判断是否是平衡二叉树（后序返回高度与是否平衡）\ndef is_balanced(root):\n    def get_height(node):\n        if not node:\n            return 0\n        left_h = get_height(node.left)\n        if left_h == -1: return -1\n        right_h = get_height(node.right)\n        if right_h == -1: return -1\n        if abs(left_h - right_h) > 1:\n            return -1  # -1 标记不平衡\n        return max(left_h, right_h) + 1\n    return get_height(root) != -1\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 树结构算法专题；\n- LeetCode 236: Lowest Common Ancestor of a Binary Tree。",
      "tips": [
        {
          "kind": "interview",
          "text": "注意：如果是二叉搜索树（BST）求 LCA，逻辑可以极大简化！若 p 和 q 都小于 root，向左找；若都大于 root，向右找；首次分叉的节点即为 LCA，时间复杂度仅为 O(H)。"
        },
        {
          "kind": "pitfall",
          "text": "计算二叉树直径时，直径可能不穿过根节点！因此必须维护全局最大值变量，后序遍历返回单侧最大深度，用 left_depth + right_depth 更新全局直径。"
        }
      ],
      "demos": [
        {
          "title": "二叉树 LCA 求解过程演示",
          "lang": "python",
          "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# 构建树:       3\n#             /   \\\n#            5     1\n#           / \\   / \\\n#          6   2 0   8\nn6 = TreeNode(6); n2 = TreeNode(2)\nn5 = TreeNode(5, n6, n2)\nn0 = TreeNode(0); n8 = TreeNode(8)\nn1 = TreeNode(1, n0, n8)\nroot = TreeNode(3, n5, n1)\n\ndef lca(r, p, q):\n    if not r or r == p or r == q: return r\n    L = lca(r.left, p, q)\n    R = lca(r.right, p, q)\n    if L and R: return r\n    return L or R\n\nprint(\"LCA(5, 1) 应为 3:\", lca(root, n5, n1).val)\nprint(\"LCA(6, 2) 应为 5:\", lca(root, n6, n2).val)"
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "algo-5-e1",
      "type": "single",
      "difficulty": 1,
      "question": "对一棵二叉搜索树（BST）进行哪种遍历，输出的节点数值序列必定是单调递增的？",
      "options": [
        {
          "value": "A",
          "text": "前序遍历"
        },
        {
          "value": "B",
          "text": "中序遍历"
        },
        {
          "value": "C",
          "text": "后序遍历"
        },
        {
          "value": "D",
          "text": "层序遍历"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】BST 的性质是「左子树 < 根节点 < 右子树」。中序遍历的顺序恰为「左 → 根 → 右」，因此自然满足单调严格递增。",
      "relatedLessonId": "algo-l-5-2",
      "tags": [
        "BST",
        "遍历"
      ]
    },
    {
      "id": "algo-5-e2",
      "type": "judge",
      "difficulty": 1,
      "question": "一棵包含 N 个节点的二叉树，如果退化成单链表，其查找节点的最坏时间复杂度为 O(N)。",
      "answer": true,
      "explanation": "【解题思路】正确。当二叉树退化为单链表时，二叉树的树高为 N，二分减半的优势完全丧失，必须线性扫描每个节点。",
      "relatedLessonId": "algo-l-5-2",
      "tags": [
        "BST",
        "复杂度"
      ]
    },
    {
      "id": "algo-5-e3",
      "type": "single",
      "difficulty": 2,
      "question": "已知某二叉树的前序遍历为 `[1, 2, 4, 5, 3]`，中序遍历为 `[4, 2, 5, 1, 3]`，则该树的根节点的左孩子是：",
      "options": [
        {
          "value": "A",
          "text": "2"
        },
        {
          "value": "B",
          "text": "3"
        },
        {
          "value": "C",
          "text": "4"
        },
        {
          "value": "D",
          "text": "5"
        }
      ],
      "answer": "A",
      "explanation": "【解题思路】前序首元素 1 必为整棵树的根。在中序遍历中找到 1，其左侧 `[4, 2, 5]` 即为左子树所有节点。在前序遍历中紧随根节点之后的元素 2，即为左子树的根节点（即 1 的左孩子）。",
      "relatedLessonId": "algo-l-5-1",
      "tags": [
        "二叉树重构"
      ]
    },
    {
      "id": "algo-5-e4",
      "type": "multiple",
      "difficulty": 2,
      "question": "下列关于二叉树层序遍历（BFS）的描述中，正确的有哪些？（多选）",
      "options": [
        {
          "value": "A",
          "text": "通常使用队列（Queue）作为辅助数据结构实现"
        },
        {
          "value": "B",
          "text": "在每层处理前记录当前队列长度，可以精确实现按层分组输出"
        },
        {
          "value": "C",
          "text": "层序遍历可用于求无权二叉树中两节点的最短距离"
        },
        {
          "value": "D",
          "text": "层序遍历的时间复杂度是 O(log N)"
        }
      ],
      "answer": [
        "A",
        "B",
        "C"
      ],
      "explanation": "【解题思路】A、B、C 均为层序遍历的标准特性与正确实践。D 错误：层序遍历必须访问树中的每个节点恰好一次，时间复杂度为 O(N)。",
      "relatedLessonId": "algo-l-5-1",
      "tags": [
        "层序遍历",
        "BFS"
      ]
    },
    {
      "id": "algo-5-e5",
      "type": "fill",
      "difficulty": 2,
      "question": "在利用递归验证二叉搜索树合法性时，若仅判断 `node.left.val < node.val` 会遗漏跨层祖先约束。正确算法应当自顶向下维护允许的取值区间 `(low, high)`，当访问左孩子时，更新后的合法区间上限应为 ___（填属性表达式）。",
      "blanks": [
        [
          "node.val"
        ]
      ],
      "explanation": "【解题思路】进入左子树时，左子树中所有节点值必须严格小于当前节点，因此区间的上限 high 收紧更新为 `node.val`，即 `(low, node.val)`。",
      "relatedLessonId": "algo-l-5-2",
      "tags": [
        "BST验证"
      ]
    },
    {
      "id": "algo-5-e6",
      "type": "judge",
      "difficulty": 2,
      "question": "在二叉树中，如果两个节点 p 和 q 分别位于当前节点 node 的左子树和右子树中，则 node 必然是 p 和 q 的最近公共祖先（LCA）。",
      "answer": true,
      "explanation": "【解题思路】正确。因为 p 和 q 在此处首次发生分叉，若向上追溯祖先，祖先必然离 p 和 q 更远，因此当前节点 node 即为「最近」的共同交汇点。",
      "relatedLessonId": "algo-l-5-3",
      "tags": [
        "LCA"
      ]
    },
    {
      "id": "algo-5-e7",
      "type": "code",
      "difficulty": 2,
      "question": "编写函数 inorder_traversal(root)，输入二叉树根节点 root，返回其中序遍历（In-order Traversal）的节点值列表。\n\n节点定义为 `class TreeNode: def __init__(self, val=0, left=None, right=None)`。空树返回空列表 `[]`。",
      "starterCode": "def inorder_traversal(root):\n    pass\n",
      "expectedOutput": "中序遍历节点值列表",
      "setupCode": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n",
      "tests": "n3 = TreeNode(3)\nn2 = TreeNode(2, left=n3)\nroot = TreeNode(1, right=n2)\nassert inorder_traversal(root) == [1, 3, 2]\nassert inorder_traversal(None) == []\nassert inorder_traversal(TreeNode(5)) == [5]",
      "answer": "def inorder_traversal(root):\n    res = []\n    def dfs(node):\n        if not node:\n            return\n        dfs(node.left)\n        res.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    return res\n\ninorder_traversal(root)",
      "explanation": "【解题思路与进阶】\n1. 中序遍历严格遵循「左子树 → 根节点 → 右子树」顺序；\n2. 递归边界为 `if not node: return`；\n3. 在 BST 中，中序遍历等价于将元素排序；时间复杂度 O(N)，空间复杂度取决于树高 O(H)。",
      "relatedLessonId": "algo-l-5-1",
      "tags": [
        "二叉树",
        "中序遍历",
        "Python编程"
      ]
    },
    {
      "id": "algo-5-e8",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 is_valid_bst(root)，验证输入的二叉树是否为有效的二叉搜索树（BST）。\n\n有效 BST 要求每个节点的左子树中所有节点值均严格小于当前节点值，右子树所有节点值均严格大于当前节点值。空树视为有效 BST 返回 True。",
      "starterCode": "def is_valid_bst(root):\n    pass\n",
      "expectedOutput": "True 或 False",
      "setupCode": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n",
      "tests": "root1 = TreeNode(2, TreeNode(1), TreeNode(3))\nassert is_valid_bst(root1) == True\nroot2 = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))\nassert is_valid_bst(root2) == False\nassert is_valid_bst(None) == True",
      "answer": "def is_valid_bst(root):\n    def validate(node, low, high):\n        if not node:\n            return True\n        if not (low < node.val < high):\n            return False\n        return validate(node.left, low, node.val) and validate(node.right, node.val, high)\n    return validate(root, float('-inf'), float('inf'))\n\nis_valid_bst(root1)",
      "explanation": "【解题思路与进阶】\n1. 关键是不能仅检查父子节点大小，必须保证左子树所有节点小于祖先，右子树所有节点大于祖先；\n2. 采用区间透传法：向下递归传递有效开区间 (low, high)；\n3. 另一种解法是中序遍历，判断输出序列是否严格单调递增；时间复杂度 O(N)，空间复杂度 O(H)。",
      "relatedLessonId": "algo-l-5-2",
      "tags": [
        "BST",
        "递归",
        "Python编程"
      ]
    },
    {
      "id": "algo-5-e9",
      "type": "code",
      "difficulty": 2,
      "question": "编写函数 max_depth(root)，计算二叉树的最大深度（从根节点到最远叶子节点的最长路径上的节点数）。空树深度为 0。",
      "starterCode": "def max_depth(root):\n    pass\n",
      "expectedOutput": "二叉树深度整数",
      "setupCode": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n",
      "tests": "root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))\nassert max_depth(root) == 3\nassert max_depth(None) == 0\nassert max_depth(TreeNode(1)) == 1",
      "answer": "def max_depth(root):\n    if not root:\n        return 0\n    return 1 + max(max_depth(root.left), max_depth(root.right))\n\nmax_depth(root)",
      "explanation": "【解题思路与进阶】\n1. 树形递归经典分治思想：一棵树的最大深度 = 1 + max(左子树深度, 右子树深度)；\n2. 递归基底：空树深度为 0；\n3. 也可以用层序遍历（BFS）计算层数；时间复杂度 O(N)。",
      "relatedLessonId": "algo-l-5-3",
      "tags": [
        "二叉树深度",
        "分治",
        "Python编程"
      ]
    }
  ]
},
{
  "id": "algo-6",
  "title": "堆与优先队列",
  "goal": "掌握完全二叉树的紧凑数组存储、二叉堆的下沉与上浮堆化机制，深入理解 O(N) 线性建堆数学证明，并熟练运用 Python heapq 优先队列解决流式 Top-K 与动态极值维护问题。",
  "lessons": [
    {
      "id": "algo-l-6-1",
      "title": "二叉堆的数组表示与上浮下沉机制",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 用「连续数组 + 下标算式」无指针表示完全二叉树，默写父节点与左右子节点的索引换算公式；\n2. 完整画出二叉堆在 \\`heappush\\`（上浮 sift_up）与 \\`heappop\\`（下沉 sift_down）过程中的元素调整路径；\n3. 用错位相减法推导自底向上建堆的时间复杂度为什么是严格的 $O(N)$ 而非 $O(N \\log N)$。\n\n### 前置知识\n\n- 「树与二叉搜索树」（algo-5）；\n- 「二分与快速选择」（algo-l-4-3）。\n\n### 问题背景\n\n在操作系统进程调度（优先执行高优先级任务）、网络路由数据包转发、以及海量数据 Top-K 实时排行榜中，我们经常需要：**不断有新数据到来，但任何时候都要能以 $O(1)$ 时间获取当前最大（或最小）的元素，且插入新元素和弹出极值的耗时不能超过 $O(\\log N)$**。普通数组（排序耗时 $O(N \\log N)$）和单链表都无法兼顾两者。二叉堆（Binary Heap）是实现**优先队列（Priority Queue）**最经典且最高效的结构。\n\n### 直觉理解\n\n堆就是一家「阶级分明但组织扁平的完全二叉树企业」：\n- **大顶堆**：每个主管的能力值必须大于等于其直接下属，最高统治者（全局最大值）必然坐在树根（下标 0）；\n- **小顶堆**：每个节点的数值都小于等于其子节点，树根必定是全局最小值；\n- **上浮（sift up）**：新员工入职从最底部末梢排起，只要业绩超过直接上级，就与上级互换工位，一路直线上升直到遇到更强的上级；\n- **下沉（sift down）**：大老板离职（弹出根节点），不能让空位空着，而是把最末尾的新人直接暂代到老板位置，然后让他和两个直属下属里「更优秀的那位」比较并互换位置，逐层往下沉沦，直到坐稳合适阶层。\n\n### 核心概念与原理详解\n\n## 1. 完全二叉树的紧凑数组表示\n\n二叉堆在结构上是一棵**完全二叉树**（除了最底层外各层全满，底层从左到右填满）。这种几何特征允许我们**完全抛弃左右指针**，直接用一块连续数组存储，内存极其紧凑，对 CPU 缓存友好！\n\n以 0 为起始下标：\n- 节点 $i$ 的**左孩子**下标：$2i + 1$\n- 节点 $i$ 的**右孩子**下标：$2i + 2$\n- 节点 $i$ 的**父节点**下标：$\\lfloor (i - 1) / 2 \\rfloor$\n\n## 2. 堆的核心操作与复杂度\n\n| 操作 | 逻辑 | 时间复杂度 |\n| :--- | :--- | :---: |\n| **查询最值** (`peek`) | 直接读取根节点 `heap[0]` | $O(1)$ |\n| **插入元素** (`push`) | 追加到数组末尾，执行 `sift_up` 上浮 | $O(\\log N)$ |\n| **弹出最值** (`pop`) | 根节点与末尾交换并弹出，对新根执行 `sift_down` 下沉 | $O(\\log N)$ |\n| **线性建堆** (`heapify`) | 从最后一个非叶子节点开始，从右向左逐个执行 `sift_down` | $O(N)$ |\n\n## 3. O(N) 线性建堆的数学推导（经典考点）\n\n为什么 $N$ 个元素的建堆时间是 $O(N)$ 而不是 $N \\times O(\\log N) = O(N \\log N)$？\n因为树中越靠近底层的节点越多，但下沉的高度越小！\n- 第 $h$ 层（叶子层）有约 $N/2$ 个节点，下沉距离为 0；\n- 第 $h-1$ 层有 $N/4$ 个节点，最多下沉 1 步；\n- 第 $h-2$ 层有 $N/8$ 个节点，最多下沉 2 步；\n- ...\n总步数：\n$$S = \\sum_{i=1}^{\\log N} \\frac{N}{2^{i+1}} \\times i = N \\sum_{i=1}^{\\log N} \\frac{i}{2^{i+1}} < N \\times 1 = O(N)$$\n利用几何级数错位相减，级数收敛于常数，因此建堆耗时为严格的线性 $O(N)$！\n\n### 代码实践\n\n```python\n# 手写简易最小堆核心机制\nclass MinHeap:\n    def __init__(self):\n        self.data = []\n\n    def push(self, val):\n        self.data.append(val)\n        self._sift_up(len(self.data) - 1)\n\n    def pop(self):\n        if not self.data: return None\n        if len(self.data) == 1: return self.data.pop()\n        root = self.data[0]\n        self.data[0] = self.data.pop() # 末尾换到根部\n        self._sift_down(0)\n        return root\n\n    def _sift_up(self, idx):\n        while idx > 0:\n            parent = (idx - 1) // 2\n            if self.data[idx] < self.data[parent]:\n                self.data[idx], self.data[parent] = self.data[parent], self.data[idx]\n                idx = parent\n            else:\n                break\n\n    def _sift_down(self, idx):\n        n = len(self.data)\n        while 2 * idx + 1 < n:\n            smallest = idx\n            left = 2 * idx + 1\n            right = 2 * idx + 2\n            if left < n and self.data[left] < self.data[smallest]:\n                smallest = left\n            if right < n and self.data[right] < self.data[smallest]:\n                smallest = right\n            if smallest != idx:\n                self.data[idx], self.data[smallest] = self.data[smallest], self.data[idx]\n                idx = smallest\n            else:\n                break\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 6 章：堆排序（堆的数据结构、维护堆性质、建堆算法分析）；\n- MIT 6.006 Lecture 4: Heaps and Heap Sort。",
      "tips": [
        {
          "kind": "pitfall",
          "text": "注意：二叉堆只保证父子之间的有序性，并不保证兄弟节点之间的左右顺序！因此二叉堆不是二叉搜索树，不能用于快速查找任意元素。"
        },
        {
          "kind": "interview",
          "text": "高频常考题：为什么堆排序空间复杂度是 O(1)？因为在原数组上直接 heapify 建最大堆，每次把堆顶换到末尾缩小堆范围，无需任何额外分配内存。"
        }
      ],
      "demos": [
        {
          "title": "二叉堆上浮与下沉全流程演示",
          "lang": "python",
          "code": "import heapq\n\n# Python 内置 heapq 默认是小顶堆（Min-Heap）\nnums = [9, 3, 1, 4, 1, 5, 9, 2, 6]\nprint(\"原始序列:\", nums)\n\n# O(N) 原地建堆\nheapq.heapify(nums)\nprint(\"heapify 后的底层数组:\", nums)\nprint(\"堆顶最小值:\", nums[0])\n\n# 依次弹出堆顶输出排序\nsorted_res = [heapq.heappop(nums) for _ in range(len(nums))]\nprint(\"堆排序输出:\", sorted_res)"
        }
      ]
    },
    {
      "id": "algo-l-6-2",
      "title": "Python heapq 模块与经典 Top-K 模式",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 熟练调用 Python 标准库 \\`heapq\\` 的核心 API（\\`heapify\\`, \\`heappush\\`, \\`heappop\\`, \\`heappushpop\\`, \\`nlargest\\`）；\n2. 掌握「求最大 K 个用小顶堆，求最小 K 个用大顶堆」的反直觉记忆法与内存优化；\n3. 解决海量数据流（Streaming Data）场景下的动态极值与中位数维护。\n\n### 前置知识\n\n- 「二叉堆的数组表示与上浮下沉机制」（algo-l-6-1）；\n- 「哈希表与计数器」（algo-l-4-1）。\n\n### 问题背景\n\n如果让你在 10 亿个搜索词中找出搜索频次最高的 100 个词（Top-100），你的服务器内存只有 4GB，绝对无法一次性将所有数据载入内存全排序（快排需要 $O(N \\log N)$ 且占满内存）。利用大小仅为 $K=100$ 的小顶堆，内存占用只有可怜的几百字节，遍历一次即可在 $O(N \\log K)$ 时间内完美解决！\n\n### 直觉理解\n\n为什么**求最大 K 个数反而要用「小顶堆」**？\n把堆想象成一个「只有 K 个名额的尖子班」：\n- 班级门口设立一个最低门槛（小顶堆堆顶是当前班里最弱的人）；\n- 每来一个新同学，只要他比班里最弱的人还弱，直接淘汰不看；\n- 只要他比班里最弱的人更强，就把最弱的踢出班级（\\`heappop\\`），让他进入班级并重新比试选出新的守门员；\n- 全部筛选完后，留在班级里的恰好就是全国前 K 名！\n这就是「小顶堆守门员模型」。\n\n### 核心概念与原理详解\n\n## 1. Python heapq 模块避坑与实用法则\n\n- `heapq` 默认且**仅支持小顶堆**；\n- 若想实现**大顶堆**，可将数值取负数存储：`(-val, val)`；\n- 存储元组时：`(priority, task_data)`，优先比较元组第一个元素；\n- 优化 API：`heapq.heappushpop(heap, item)` 比先 push 再 pop 更快，只需一次比较下沉。\n\n## 2. 经典高频题型：数据流中位数（双堆模型）\n\n数据流中数字不断增加，如何随时以 $O(1)$ 时间获取当前所有数字的中位数？\n- 维护两个堆：\n  1. **大顶堆（max_heap）**：存储较小的那一半数字；\n  2. **小顶堆（min_heap）**：存储较大的那一半数字；\n- 保证两堆大小平衡（`len(max_heap) == len(min_heap)` 或 `+1`）；\n- 中位数即为大顶堆堆顶，或两堆堆顶的平均值！\n\n### 代码实践\n\n```python\nimport heapq\nfrom collections import Counter\n\n# 1. 数组中第 K 个最大元素（小顶堆解法：空间 O(K)）\ndef find_kth_largest(nums, k):\n    heap = []\n    for x in nums:\n        if len(heap) < k:\n            heapq.heappush(heap, x)\n        elif x > heap[0]:\n            heapq.heapreplace(heap, x)\n    return heap[0]\n\n# 2. 前 K 个高频元素\ndef top_k_frequent(nums, k):\n    counts = Counter(nums)\n    # 小顶堆维护频率最大的 k 个\n    heap = []\n    for num, freq in counts.items():\n        if len(heap) < k:\n            heapq.heappush(heap, (freq, num))\n        elif freq > heap[0][0]:\n            heapq.heapreplace(heap, (freq, num))\n    return [num for freq, num in heap]\n```\n\n### 权威参考来源\n\n- Python 官方文档：\\`heapq — Heap queue algorithm\\`；\n- LeetCode 215: Kth Largest Element in an Array；LeetCode 295: Find Median from Data Stream。",
      "tips": [
        {
          "kind": "performance",
          "text": "heapq.heapreplace(h, x) 等价于 heappop 后 heappush，且仅需一次堆化调整，比分别调用 pop 和 push 效率高出一倍。"
        },
        {
          "kind": "pitfall",
          "text": "当元组作为堆元素时，如果第一个优先级字段相同，Python 会自动比较第二个字段。若第二个字段不支持比较（如自定义对象），会抛出 TypeError！解决方法是传入唯一序号自增 ID 作为第二项。"
        }
      ],
      "demos": [
        {
          "title": "利用小顶堆解决 Top-K 元素筛选",
          "lang": "python",
          "code": "import heapq\n\ndata = [3, 10, 5, 20, 1, 8, 30, 25, 12]\nK = 3\n\n# 求最大 3 个元素：维护大小为 3 的小顶堆\nmin_heap = []\nfor x in data:\n    if len(min_heap) < K:\n        heapq.heappush(min_heap, x)\n    elif x > min_heap[0]:\n        heapq.heapreplace(min_heap, x)\n\nprint(\"原始数据:\", data)\nprint(f\"最大的 {K} 个元素（堆内）:\", sorted(min_heap, reverse=True))"
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "algo-6-e1",
      "type": "single",
      "difficulty": 1,
      "question": "在一个用数组存储的小顶堆中，若根节点的索引为 0，则索引为 3 的节点的左孩子节点的索引是：",
      "options": [
        {
          "value": "A",
          "text": "6"
        },
        {
          "value": "B",
          "text": "7"
        },
        {
          "value": "C",
          "text": "8"
        },
        {
          "value": "D",
          "text": "9"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】对于从 0 开始计数的完全二叉树数组表示，节点 i 的左孩子下标计算公式为 2*i + 1。当 i = 3 时，左孩子下标为 2*3 + 1 = 7。",
      "relatedLessonId": "algo-l-6-1",
      "tags": [
        "二叉堆",
        "下标推导"
      ]
    },
    {
      "id": "algo-6-e2",
      "type": "judge",
      "difficulty": 2,
      "question": "自底向上对包含 N 个元素的无序数组执行堆化（heapify），其渐进时间复杂度为 O(N)。",
      "answer": true,
      "explanation": "【解题思路】正确。虽然单次下沉最坏是 O(log N)，但底层节点多且下沉步数极短，利用级数错位相减推导总步数收敛于常数倍 N，因此建堆耗时为严格的 O(N)。",
      "relatedLessonId": "algo-l-6-1",
      "tags": [
        "建堆复杂度",
        "CLRS"
      ]
    },
    {
      "id": "algo-6-e3",
      "type": "single",
      "difficulty": 2,
      "question": "在海量数据流中实时求取最大的 100 个数（Top-100），最适合的堆策略是：",
      "options": [
        {
          "value": "A",
          "text": "维护容量为 100 的大顶堆"
        },
        {
          "value": "B",
          "text": "维护容量为 100 的小顶堆"
        },
        {
          "value": "C",
          "text": "全量数据建立大顶堆再弹出 100 次"
        },
        {
          "value": "D",
          "text": "维护无界小顶堆"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】维护容量为 100 的小顶堆，堆顶保存当前前 100 大集合中的最小值（守门员）。新元素只要大于堆顶就替换堆顶下沉，空间复杂度仅为 O(K)。",
      "relatedLessonId": "algo-l-6-2",
      "tags": [
        "Top-K",
        "优先队列"
      ]
    },
    {
      "id": "algo-6-e4",
      "type": "multiple",
      "difficulty": 2,
      "question": "下列关于二叉堆特性的说法中，正确的有哪些？（多选）",
      "options": [
        {
          "value": "A",
          "text": "二叉堆结构上是一棵完全二叉树"
        },
        {
          "value": "B",
          "text": "在二叉堆中，兄弟节点之间一定保持左小右大的顺序"
        },
        {
          "value": "C",
          "text": "大顶堆的堆顶必然是全堆的最大值"
        },
        {
          "value": "D",
          "text": "向大小为 N 的二叉堆插入一个元素的时间复杂度是 O(log N)"
        }
      ],
      "answer": [
        "A",
        "C",
        "D"
      ],
      "explanation": "【解题思路】A、C、D 均为二叉堆的经典定义与复杂度。B 错误：二叉堆只约束父子关系，左右兄弟节点之间并无大小顺序约束。",
      "relatedLessonId": "algo-l-6-1",
      "tags": [
        "二叉堆概念"
      ]
    },
    {
      "id": "algo-6-e5",
      "type": "fill",
      "difficulty": 2,
      "question": "在 Python 内置的 `heapq` 模块中，默认实现的堆是 ___（填“大顶堆”或“小顶堆”）。",
      "blanks": [
        [
          "小顶堆"
        ]
      ],
      "explanation": "【解题思路】Python 的 `heapq` 模块默认仅实现小顶堆（Min-Heap），若要实现大顶堆通常需要对存入的数值取负数。",
      "relatedLessonId": "algo-l-6-2",
      "tags": [
        "heapq",
        "Python特性"
      ]
    },
    {
      "id": "algo-6-e6",
      "type": "judge",
      "difficulty": 2,
      "question": "堆排序是一种稳定的排序算法。",
      "answer": false,
      "explanation": "【解题思路】错误。堆排序在将堆顶元素与末尾元素互换以及下沉的过程中，会跨越很长距离打乱原本相等元素的相对次序，因此是非稳定排序算法。",
      "relatedLessonId": "algo-l-6-1",
      "tags": [
        "堆排序",
        "稳定性"
      ]
    },
    {
      "id": "algo-6-e7",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 find_kth_largest(nums, k)，使用容量为 k 的小顶堆（heapq），寻找整数数组 nums 中第 k 个最大的元素（从 1 开始计数）。保证 1 <= k <= len(nums)。",
      "starterCode": "import heapq\n\ndef find_kth_largest(nums, k):\n    pass\n",
      "expectedOutput": "第 k 个最大的整数",
      "tests": "assert find_kth_largest([3, 2, 1, 5, 6, 4], 2) == 5\nassert find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4\nassert find_kth_largest([1], 1) == 1",
      "answer": "import heapq\n\ndef find_kth_largest(nums, k):\n    heap = []\n    for x in nums:\n        if len(heap) < k:\n            heapq.heappush(heap, x)\n        elif x > heap[0]:\n            heapq.heapreplace(heap, x)\n    return heap[0]\n\nfind_kth_largest([3, 2, 1, 5, 6, 4], 2)",
      "explanation": "【解题思路与进阶】\n1. 维护大小为 k 的小顶堆，遍历数组时比堆顶大的元素进入堆中并替换堆顶；\n2. 遍历结束后，堆中存放的就是前 k 个最大的数，而堆顶恰好是第 k 大的数；\n3. 时间复杂度 O(N log k)，空间复杂度 O(k)，非常适合海量数据流场景。",
      "relatedLessonId": "algo-l-6-2",
      "tags": [
        "Top-K",
        "heapq",
        "Python编程"
      ]
    },
    {
      "id": "algo-6-e8",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 top_k_frequent(nums, k)，输入整数数组 nums 与整数 k，返回出现频率前 k 高的元素列表（结果顺序不限）。",
      "starterCode": "from collections import Counter\nimport heapq\n\ndef top_k_frequent(nums, k):\n    pass\n",
      "expectedOutput": "前 k 高频元素列表",
      "tests": "res1 = top_k_frequent([1, 1, 1, 2, 2, 3], 2)\nassert sorted(res1) == [1, 2]\nassert top_k_frequent([1], 1) == [1]",
      "answer": "from collections import Counter\nimport heapq\n\ndef top_k_frequent(nums, k):\n    counts = Counter(nums)\n    return [val for val, freq in counts.most_common(k)]\n\ntop_k_frequent([1, 1, 1, 2, 2, 3], 2)",
      "explanation": "【解题思路与进阶】\n1. 首先用 Counter 统计各元素频率，耗时 O(N)；\n2. 维护大小为 k 的以频次为主键的小顶堆，或直接利用 Counter 的 `most_common(k)`（底层基于 heapq 实现）；\n3. 总体时间复杂度为 O(N log k)。",
      "relatedLessonId": "algo-l-6-2",
      "tags": [
        "高频统计",
        "哈希与堆",
        "Python编程"
      ]
    }
  ]
}
];
