import type { Chapter } from '../../types';

/* ============================================================
 *  《算法与数据结构》第 7~8 章：图与图算法、动态规划
 * ============================================================ */

export const algoExtra4: Omit<Chapter, 'courseId' | 'order'>[] = [
{
  "id": "algo-7",
  "title": "图与图算法",
  "goal": "掌握图的邻接表与邻接矩阵存储表示，熟练运用 BFS 与 DFS 探索连通分量，掌握并查集（Union-Find）的路径压缩与按秩合并，深入推导拓扑排序（Kahn 算法）检测依赖环，以及单源最短路径 Dijkstra 算法的贪心松弛原理。",
  "lessons": [
    {
      "id": "algo-l-7-1",
      "title": "图的存储结构与基础遍历（DFS 与 BFS）",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 对比邻接矩阵（Adjacency Matrix）与邻接表（Adjacency List）在稀疏图与稠密图上的空间与时间开销；\n2. 解释图遍历与树遍历的关键差异（引入 \\`visited\\` 集合以防止环路死循环）；\n3. 熟练手写基于递归调用的图 DFS 连通性遍历与基于队列的图 BFS 最短步数搜索。\n\n### 前置知识\n\n- 「树与二叉搜索树」（algo-5）；\n- 「栈与队列」（algo-l-3-2）。\n\n### 问题背景\n\n如果说线性结构是一维的街道、树是自顶向下的层级组织，那么**图（Graph）就是最自由、最通用的网状拓扑结构**。社交网络中的好友关系（无向图）、互联网网页之间的超链接（有向图）、城市航线与地图导航（带权图）、软件包依赖关系（DAG）无一例外都是图。掌握图算法是从初级程序员迈向算法高手的关键门槛。\n\n### 直觉理解\n\n- **邻接矩阵**：一张 $V \\times V$ 的大表格，行是起点，列是终点，单元格填 1 或权重。像查城市高铁直达表，查两个人是不是好友只需看对应格子（$O(1)$），但如果只有几个人互相关注，大部分格子都是 0，白白浪费 $O(V^2)$ 的巨大空间。\n- **邻接表**：每个节点挂着一个通讯录（列表或集合），记录自己的直接邻居。对于互联网这种每个节点只有少量连接的「稀疏图」，空间只占 $O(V + E)$，是工业界首选。\n- **visited 护照印章**：图与树最大的区别是**图可能有环**！从 A 走到 B，B 走到 C，C 又能走回 A。如果盲目递归就会永远死循环栈溢出。因此，每走过一个节点必须盖一个戳（\\`visited.add(u)\\`），绝不二度踏入。\n\n### 核心概念与原理详解\n\n## 1. 存储结构对比\n\n| 存储方式 | 空间复杂度 | 判断两点 $(u, v)$ 是否有边 | 遍历节点 $u$ 的所有邻居 | 适用场景 |\n| :--- | :---: | :---: | :---: | :--- |\n| **邻接矩阵** | $O(V^2)$ | $O(1)$ | $O(V)$ | 稠密图（边数接近 $V^2$） |\n| **邻接表** | $O(V + E)$ | $O(\\text{degree}(u))$ | $O(\\text{degree}(u))$ | 稀疏图（现实世界绝大多数图） |\n\n## 2. 图的深度优先搜索（DFS）与广度优先搜索（BFS）\n\n- **DFS（一条路走到黑）**：从起点出发，沿着某条边一直深入探索，直到碰壁（无未访问邻居）再回退一步换条路走。适合：求所有可能路径、检测连通性、二分图判定。\n- **BFS（水波扩散）**：从起点出发，先访问距离为 1 的所有邻居，再访问距离为 2 的所有邻居。**核心定理**：在无权图中，BFS 首次到达某个节点所经历的步数，必然是从起点到该节点的**最短路径**！\n\n### 代码实践\n\n```python\nfrom collections import deque\n\n# 构建邻接表\ndef build_graph(n, edges, directed=False):\n    adj = {i: [] for i in range(n)}\n    for u, v in edges:\n        adj[u].append(v)\n        if not directed:\n            adj[v].append(u)\n    return adj\n\n# 1. 图的 DFS 连通分量遍历\ndef dfs_traverse(u, adj, visited):\n    visited.add(u)\n    for v in adj[u]:\n        if v not in visited:\n            dfs_traverse(v, adj, visited)\n\n# 2. 图的 BFS 无权最短路径步数\ndef bfs_shortest_path(start, target, adj):\n    if start == target: return 0\n    visited = {start}\n    q = deque([(start, 0)]) # (node, step)\n    while q:\n        curr, step = q.popleft()\n        if curr == target:\n            return step\n        for nxt in adj[curr]:\n            if nxt not in visited:\n                visited.add(nxt)\n                q.append((nxt, step + 1))\n    return -1\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 22 章：基本的图算法（图的表示、广度优先搜索、深度优先搜索）；\n- Sedgewick & Wayne 《Algorithms》 第 4.1 节：Undirected Graphs。",
      "tips": [
        {
          "kind": "pitfall",
          "text": "千万不要在 pop 节点时才加入 visited 集合！BFS 必须在「入队 push 时」立即加入 visited，否则同一个节点会被多个前驱重复加入队列，造成队列元素指数级爆炸！"
        },
        {
          "kind": "interview",
          "text": "经典辨析：树的节点数 N 与边数必然满足 E = N - 1；图如果连通且 E = N - 1，则该图是一棵树。"
        }
      ],
      "demos": [
        {
          "title": "图的邻接表构建与 BFS 最短路径",
          "lang": "python",
          "code": "from collections import deque\n\nedges = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5]]\nn = 6\n\nadj = {i: [] for i in range(n)}\nfor u, v in edges:\n    adj[u].append(v)\n    adj[v].append(u)\n\n# 求 0 到 5 的最短跳数\ndef bfs(start, end):\n    q = deque([(start, 0)])\n    vis = {start}\n    while q:\n        u, d = q.popleft()\n        if u == end: return d\n        for v in adj[u]:\n            if v not in vis:\n                vis.add(v)\n                q.append((v, d + 1))\n    return -1\n\nprint(\"节点 0 到 5 的最短距离:\", bfs(0, 5))"
        }
      ]
    },
    {
      "id": "algo-l-7-2",
      "title": "并查集（Union-Find）与动态连通性",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 阐明并查集解决的动态连通性问题，理解集合的树形表示；\n2. 掌握并查集的两大核心优化：**路径压缩（Path Compression）**与**按秩合并（Union by Rank）**；\n3. 推导双重优化下并查集单次操作的反阿克曼函数 $\\alpha(N)$ 近似 $O(1)$ 时间复杂度。\n\n### 前置知识\n\n- 「树与二叉搜索树」（algo-5）；\n- 「图的存储结构与基础遍历」（algo-l-7-1）。\n\n### 问题背景\n\n给出一系列网络电缆连接关系 `(A, B)`，每次连接后都需要迅速判断：某两台电脑之间是否已经连通？如果用图的 DFS/BFS，每次询问都需要遍历一遍图（$O(V + E)$）。并查集（Union-Find）是一种专门设计用于**极速合并集合**与**判断两元素是否同属一个集合**的高效树形数据结构。\n\n### 直觉理解\n\n把并查集想象成「武林门派归属与认门主」：\n- 每个门派推选一名威望最高的**掌门人（根节点）**，其他成员逐层向上指向自己的师父；\n- **查询根节点（Find）**：拿着弟子令牌一路往上问，直到找到该门派的最高掌门人；\n- **合并门派（Union）**：两个门派联姻，只需让门派 A 的掌门人向门派 B 的掌门人行礼认老大即可；\n- **路径压缩（极致提速）**：每次一个弟子找到老掌门后，老掌门直接给他发微信私信：「以后别一层层找师父通报了，直接跟我汇报！」——把所有递归途中的子孙直接挂在根节点下，树高瞬间扁平化为 1！\n\n### 核心概念与原理详解\n\n## 1. 数组实现的双亲表示法\n\n维护一个数组 `parent`，其中 `parent[i]` 表示节点 $i$ 的父节点编号：\n- 初始化时：每个元素都是独立的集合，`parent[i] = i`（自己是自己的掌门人）。\n\n## 2. 路径压缩（Path Compression）\n\n```python\ndef find(self, x):\n    if self.parent[x] != x:\n        self.parent[x] = self.find(self.parent[x]) # 扁平化压缩！\n    return self.parent[x]\n```\n\n## 3. 算法复杂度：反阿克曼函数\n\n如果同时使用**路径压缩**和**按秩合并**，并查集 $M$ 次操作的摊还时间复杂度为 $O(M \\alpha(N))$。\n其中 $\\alpha(N)$ 为阿克曼反函数。对于宇宙中所有可能的数据规模（哪怕 $N = 2^{65536}$），$\\alpha(N) \\le 4$！\n在工程实际中，单次操作均摊时间完全可以视为**纯粹的常数时间 $O(1)$**。\n\n### 代码实践\n\n```python\nclass UnionFind:\n    def __init__(self, n):\n        self.parent = list(range(n))\n        self.rank = [1] * n\n        self.count = n # 连通分量计数\n\n    def find(self, x):\n        if self.parent[x] != x:\n            self.parent[x] = self.find(self.parent[x]) # 递归路径压缩\n        return self.parent[x]\n\n    def union(self, x, y):\n        rx, ry = self.find(x), self.find(y)\n        if rx == ry:\n            return False # 已经在同一集合，产生环！\n        # 按秩合并：浅树挂在深树下\n        if self.rank[rx] < self.rank[ry]:\n            self.parent[rx] = ry\n        elif self.rank[rx] > self.rank[ry]:\n            self.parent[ry] = rx\n        else:\n            self.parent[rx] = ry\n            self.rank[ry] += 1\n        self.count -= 1\n        return True\n```\n\n### 权威参考来源\n\n- Tarjan, R. E. (1975). \"Efficiency of a Good But Not Linear Set Union Algorithm\";\n- 《算法导论》(CLRS) 第 21 章：用于不相交集合的数据结构。",
      "tips": [
        {
          "kind": "interview",
          "text": "高频应用：无向图环检测。若一条边 (u, v) 的两个端点已经在同一个并查集集合中（find(u) == find(v)），则这条边必然会构成一个环！"
        },
        {
          "kind": "pitfall",
          "text": "并查集只适用于「无向图」的动态连通性与环检测。对于「有向图」，检测环必须使用 DFS 染色法或拓扑排序！"
        }
      ],
      "demos": [
        {
          "title": "并查集动态连通分量维护演示",
          "lang": "python",
          "code": "class UF:\n    def __init__(self, n):\n        self.p = list(range(n))\n        self.cnt = n\n    def find(self, x):\n        if self.p[x] != x: self.p[x] = self.find(self.p[x])\n        return self.p[x]\n    def union(self, x, y):\n        rx, ry = self.find(x), self.find(y)\n        if rx != ry:\n            self.p[rx] = ry\n            self.cnt -= 1\n\nuf = UF(5)\nprint(\"初始 5 个独立连通块:\", uf.cnt)\nuf.union(0, 1)\nuf.union(1, 2)\nprint(\"连接 (0,1) 和 (1,2) 后连通块数量:\", uf.cnt)\nprint(\"0 和 2 是否连通:\", uf.find(0) == uf.find(2))\nprint(\"0 和 4 是否连通:\", uf.find(0) == uf.find(4))"
        }
      ]
    },
    {
      "id": "algo-l-7-3",
      "title": "有向无环图（DAG）拓扑排序与单源最短路径",
      "difficulty": 4,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 给出拓扑排序的严格定义，证明只有有向无环图（DAG）才存在拓扑排序；\n2. 熟练运用基于入度表的 Kahn 算法实现拓扑排序，并利用其检测有向图中是否存在环；\n3. 阐明 Dijkstra 最短路径算法的贪心选择性质与松弛（Relaxation）机制，使用最小堆实现 $O(E \\log V)$ 的高效算法。\n\n### 前置知识\n\n- 「堆与优先队列」（algo-6）；\n- 「图的存储结构与基础遍历」（algo-l-7-1）。\n\n### 问题背景\n\n大学选课系统（修《算法》前必须先修《Python》和《离散数学》）、代码工程构建依赖工具（编译模块 A 前必须先编译依赖的库 B）、任务工期规划（PERT 图）都需要求解一种**线性的先后执行次序**——这就是拓扑排序。如果存在循环依赖（A 依赖 B，B 依赖 A），拓扑排序就会报错中断。而在网络路由和高德地图导航中，寻找带权路网的最优路径则是经典 Dijkstra 算法的统治领域。\n\n### 直觉理解\n\n- **拓扑排序（Kahn 算法 / 剥洋葱）**：\n  1. 统计每个节点的「入度」（有多少先决条件指向自己）；\n  2. 挑选入度为 0 的节点（没有任何前置要求，可以立即开始）入队；\n  3. 弹出节点，执行该任务，并顺手将其所有后继依赖的入度减 1（消解前置依赖）；\n  4. 如果产生新的入度为 0 节点，继续入队；\n  5. 循环结束：如果排出的节点数等于总节点数，说明没有死循环；否则说明图中有「死锁环」！\n- **Dijkstra 算法（贪心扩散）**：\n  把所有城市想成节点，路线想成带长短的橡皮筋。从起点开始往外拉，每次拉出的都是「当前距离起点最近且未锁定的城市」，一旦锁定，该城市的最短距离就盖棺定论，随后利用它的出边去更新其他邻居的最短距离（松弛操作）。\n\n### 核心概念与原理详解\n\n## 1. 拓扑排序：Kahn 算法复杂度\n\n- 时间复杂度：$O(V + E)$（每个顶点入队出队一次，每条边遍历削减一次）；\n- 空间复杂度：$O(V + E)$（邻接表与入度数组）。\n\n## 2. 单源最短路径：Dijkstra 算法\n\n- **适用条件**：**所有边的权重必须为非负数**（若有负权边，贪心选择性质失效，必须使用 Bellman-Ford / SPFA 算法）；\n- **松弛操作（Relaxation）**：\n  对于边 $(u, v, w)$，如果通过节点 $u$ 能让到 $v$ 的路程变短，即：\n  $$dist[v] > dist[u] + w$$\n  则更新 $dist[v] = dist[u] + w$，并将 $(dist[v], v)$ 压入最小堆中；\n- **最小堆优化复杂度**：$O(E \\log V)$。\n\n### 代码实践\n\n```python\nfrom collections import deque\nimport heapq\n\n# 1. 拓扑排序 (Kahn 算法)\ndef topological_sort(num_courses, prerequisites):\n    adj = {i: [] for i in range(num_courses)}\n    indegree = [0] * num_courses\n    for dest, src in prerequisites:\n        adj[src].append(dest)\n        indegree[dest] += 1\n    q = deque([i for i in range(num_courses) if indegree[i] == 0])\n    order = []\n    while q:\n        u = q.popleft()\n        order.append(u)\n        for v in adj[u]:\n            indegree[v] -= 1\n            if indegree[v] == 0:\n                q.append(v)\n    return order if len(order) == num_courses else [] # 空列表表示有环\n\n# 2. Dijkstra 最短路径算法\ndef dijkstra(n, graph, start):\n    # graph: {u: [(v, weight), ...]}\n    dist = {i: float('inf') for i in range(n)}\n    dist[start] = 0\n    pq = [(0, start)] # (d, u)\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]: # 已经找到更短路径，跳过旧记录\n            continue\n        for v, w in graph.get(u, []):\n            if dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 22.4 节：拓扑排序；第 24.3 节：Dijkstra 算法；\n- Kahn, A. B. (1962). \"Topological sorting of large networks\". *Communications of the ACM*。",
      "tips": [
        {
          "kind": "pitfall",
          "text": "Dijkstra 绝不能处理含有负权边的图！因为 Dijkstra 认为一旦某个节点从最小堆弹出，它的最短路径就已经确定；但负权边可能让后序迂回路径的总花费变得更小，打破这一贪心前提。"
        },
        {
          "kind": "interview",
          "text": "面试高频题：LeetCode 207《课程表》与 LeetCode 210《课程表 II》。本质就是拓扑排序检测环与输出拓扑序列。"
        }
      ],
      "demos": [
        {
          "title": "拓扑排序排课检测流程演示",
          "lang": "python",
          "code": "from collections import deque\n\n# 4 门课：[0, 1] 表示想学 0 必须先修 1\nprereqs = [[1, 0], [2, 0], [3, 1], [3, 2]]\nn = 4\n\nadj = {i: [] for i in range(n)}\nindeg = [0] * n\nfor dest, src in prereqs:\n    adj[src].append(dest)\n    indeg[dest] += 1\n\nq = deque([i for i in range(n) if indeg[i] == 0])\norder = []\nwhile q:\n    u = q.popleft()\n    order.append(u)\n    for v in adj[u]:\n        indeg[v] -= 1\n        if indeg[v] == 0: q.append(v)\n\nprint(\"拓扑排课可行顺序:\", order)"
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "algo-7-e1",
      "type": "single",
      "difficulty": 1,
      "question": "对于包含 V 个顶点、E 条边的稀疏图，采用邻接表（Adjacency List）存储的空间复杂度为：",
      "options": [
        {
          "value": "A",
          "text": "O(V)"
        },
        {
          "value": "B",
          "text": "O(V + E)"
        },
        {
          "value": "C",
          "text": "O(V^2)"
        },
        {
          "value": "D",
          "text": "O(V * E)"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】邻接表需要为每个顶点维护一个头节点指针（大小为 V），并在所有列表中总共存储 2E（无向图）或 E（有向图）个边节点，因此总空间复杂度为 O(V + E)。",
      "relatedLessonId": "algo-l-7-1",
      "tags": [
        "图存储",
        "邻接表"
      ]
    },
    {
      "id": "algo-7-e2",
      "type": "judge",
      "difficulty": 2,
      "question": "在无权图中，使用广度优先搜索（BFS）首次到达目标节点所经过的边数，必然是起点到目标节点的最短路径长度。",
      "answer": true,
      "explanation": "【解题思路】正确。BFS 是按层逐圈向外扩展的，第 k 层的节点与起点的最短距离恰好为 k。首次访问到目标节点必然是在最小可能的层数，因而保证了最短性。",
      "relatedLessonId": "algo-l-7-1",
      "tags": [
        "BFS",
        "最短路径"
      ]
    },
    {
      "id": "algo-7-e3",
      "type": "single",
      "difficulty": 2,
      "question": "如果一个有向图包含环路（Cycle），对其执行 Kahn 拓扑排序算法，算法最终的表现是：",
      "options": [
        {
          "value": "A",
          "text": "抛出 RecursionError 异常死循环"
        },
        {
          "value": "B",
          "text": "输出的序列长度小于顶点总数 V"
        },
        {
          "value": "C",
          "text": "正确输出包含环的拓扑序列"
        },
        {
          "value": "D",
          "text": "返回包含所有逆向边的列表"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】环上的所有顶点的入度永远不可能降为 0，因此环上的点永远不会被入队。Kahn 算法排出的节点总数必然严格小于 V，据此可判断图中存在有向环。",
      "relatedLessonId": "algo-l-7-3",
      "tags": [
        "拓扑排序",
        "环检测"
      ]
    },
    {
      "id": "algo-7-e4",
      "type": "multiple",
      "difficulty": 2,
      "question": "下列关于 Dijkstra 最短路径算法的说法中，正确的有哪些？（多选）",
      "options": [
        {
          "value": "A",
          "text": "Dijkstra 算法要求所有边的权重必须非负"
        },
        {
          "value": "B",
          "text": "借助最小堆优先队列优化，其时间复杂度可以达到 O(E log V)"
        },
        {
          "value": "C",
          "text": "Dijkstra 算法基于贪心选择性质与松弛操作"
        },
        {
          "value": "D",
          "text": "对于存在负权边的有向图，Dijkstra 依然能保证结果绝对正确"
        }
      ],
      "answer": [
        "A",
        "B",
        "C"
      ],
      "explanation": "【解题思路】A、B、C 均为 Dijkstra 算法的核心事实。D 错误：若存在负权边，贪心选择性质失效，必须改用 Bellman-Ford 或 SPFA 算法。",
      "relatedLessonId": "algo-l-7-3",
      "tags": [
        "Dijkstra",
        "最短路径"
      ]
    },
    {
      "id": "algo-7-e5",
      "type": "fill",
      "difficulty": 2,
      "question": "并查集（Union-Find）在执行递归查找时，顺便把沿途经过的节点的父指针直接指向根节点，这项极为关键的优化技术称为 ___（填四个字）。",
      "blanks": [
        [
          "路径压缩"
        ]
      ],
      "explanation": "【解题思路】路径压缩（Path Compression）将树的高度压缩扁平化，使得后续查找操作的时间复杂度大幅降至均摊常数级别。",
      "relatedLessonId": "algo-l-7-2",
      "tags": [
        "并查集",
        "路径压缩"
      ]
    },
    {
      "id": "algo-7-e6",
      "type": "judge",
      "difficulty": 1,
      "question": "一个包含 N 个顶点的连通无向图，如果其边数恰好为 N - 1，则该图必然是一棵树（无环连通图）。",
      "answer": true,
      "explanation": "【解题思路】正确。这是树的等价数学定义之一：连通且 E = V - 1 的无向图必然无环，等价于一棵树。",
      "relatedLessonId": "algo-l-7-1",
      "tags": [
        "图论基础",
        "树定理"
      ]
    },
    {
      "id": "algo-7-e7",
      "type": "code",
      "difficulty": 2,
      "question": "编写函数 valid_path(n, edges, source, destination)，判断在一个包含 n 个顶点（编号 0 到 n-1）的无向图中，是否存在从 source 到 destination 的有效路径。存在返回 True，否则返回 False。",
      "starterCode": "from collections import deque\n\ndef valid_path(n, edges, source, destination):\n    pass\n",
      "expectedOutput": "True 或 False",
      "tests": "assert valid_path(3, [[0, 1], [1, 2], [2, 0]], 0, 2) == True\nassert valid_path(6, [[0, 1], [0, 2], [3, 5], [5, 4], [4, 3]], 0, 5) == False\nassert valid_path(1, [], 0, 0) == True",
      "answer": "from collections import deque\n\ndef valid_path(n, edges, source, destination):\n    if source == destination:\n        return True\n    adj = {i: [] for i in range(n)}\n    for u, v in edges:\n        adj[u].append(v)\n        adj[v].append(u)\n    visited = {source}\n    q = deque([source])\n    while q:\n        curr = q.popleft()\n        if curr == destination:\n            return True\n        for nxt in adj[curr]:\n            if nxt not in visited:\n                visited.add(nxt)\n                q.append(nxt)\n    return False\n\nvalid_path(3, [[0, 1], [1, 2], [2, 0]], 0, 2)",
      "explanation": "【解题思路与进阶】\n1. 边界情况：若起点等于终点直接返回 True；\n2. 构建无向图邻接表，利用队列实现标准 BFS；\n3. 记得在将节点加入队列时立即写入 visited 集合防止重复扩展；时间复杂度 O(V + E)。",
      "relatedLessonId": "algo-l-7-1",
      "tags": [
        "图BFS",
        "连通性",
        "Python编程"
      ]
    },
    {
      "id": "algo-7-e8",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 can_finish(numCourses, prerequisites)，判断学生能否完成全部课程。\n\n你总共需要选修 numCourses 门课程（编号 0 到 numCourses-1）。prerequisites[i] = [a, b] 表示修课程 a 必须先修课程 b。如果能够完成所有课程返回 True，如果存在依赖环返回 False。",
      "starterCode": "from collections import deque\n\ndef can_finish(numCourses, prerequisites):\n    pass\n",
      "expectedOutput": "True 或 False",
      "tests": "assert can_finish(2, [[1, 0]]) == True\nassert can_finish(2, [[1, 0], [0, 1]]) == False\nassert can_finish(3, [[0, 1], [1, 2], [2, 0]]) == False",
      "answer": "from collections import deque\n\ndef can_finish(numCourses, prerequisites):\n    adj = {i: [] for i in range(numCourses)}\n    indegree = [0] * numCourses\n    for dest, src in prerequisites:\n        adj[src].append(dest)\n        indegree[dest] += 1\n    q = deque([i for i in range(numCourses) if indegree[i] == 0])\n    count = 0\n    while q:\n        u = q.popleft()\n        count += 1\n        for v in adj[u]:\n            indegree[v] -= 1\n            if indegree[v] == 0:\n                q.append(v)\n    return count == numCourses\n\ncan_finish(2, [[1, 0]])",
      "explanation": "【解题思路与进阶】\n1. Kahn 拓扑排序算法的典型工程应用；\n2. 统计所有节点的入度，把入度为 0 的节点加入队列；\n3. 依次弹出节点，将指向邻居的入度减 1，如果邻居入度变为 0 则入队；\n4. 最终出队节点总数等于总课程数则无环，否则存在循环依赖；时间复杂度 O(V + E)。",
      "relatedLessonId": "algo-l-7-3",
      "tags": [
        "拓扑排序",
        "环检测",
        "Python编程"
      ]
    },
    {
      "id": "algo-7-e9",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 count_components(n, edges)，使用并查集（Union-Find），计算一个包含 n 个节点（编号 0 到 n-1）和无向边列表 edges 的图中的连通分量总数。",
      "starterCode": "def count_components(n, edges):\n    pass\n",
      "expectedOutput": "连通分量数量整数",
      "tests": "assert count_components(5, [[0, 1], [1, 2], [3, 4]]) == 2\nassert count_components(5, [[0, 1], [1, 2], [2, 3], [3, 4]]) == 1\nassert count_components(4, []) == 4",
      "answer": "def count_components(n, edges):\n    parent = list(range(n))\n    def find(x):\n        if parent[x] != x:\n            parent[x] = find(parent[x])\n        return parent[x]\n    def union(x, y):\n        rx, ry = find(x), find(y)\n        if rx != ry:\n            parent[rx] = ry\n            return True\n        return False\n    components = n\n    for u, v in edges:\n        if union(u, v):\n            components -= 1\n    return components\n\ncount_components(5, [[0, 1], [1, 2], [3, 4]])",
      "explanation": "【解题思路与进阶】\n1. 初始化 n 个连通分量，每个顶点的父节点为自身；\n2. 遍历每条边执行 union 操作，若两个顶点属于不同集合则合并，并将连通分量计数器减 1；\n3. 带路径压缩的并查集均摊单次操作接近 O(1)，总时间复杂度仅为 O(V + E α(V))。",
      "relatedLessonId": "algo-l-7-2",
      "tags": [
        "并查集",
        "连通分量",
        "Python编程"
      ]
    }
  ]
},
{
  "id": "algo-8",
  "title": "动态规划",
  "goal": "深刻领悟动态规划的本质三要素（重叠子问题、最优子结构与无后效性），掌握从暴力递归到记忆化搜索再到底层递推的蜕变全过程，熟练手推 0-1 背包、完全背包一维滚动数组压缩，攻克最长递增子序列（LIS）与编辑距离等经典序列决策模型。",
  "lessons": [
    {
      "id": "algo-l-8-1",
      "title": "动态规划三要素与记忆化搜索",
      "difficulty": 3,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 阐明动态规划（Dynamic Programming, DP）的核心三要素：**最优子结构**、**重叠子问题**与**无后效性**；\n2. 画出斐波那契数列与爬楼梯问题的重叠递归树，指出冗余计算所在；\n3. 完成从「暴力递归」到「记忆化搜索（备忘录）」再到「自底向上 DP 表递推」的三步蜕变，并推导空间复杂度从 $O(N)$ 到 $O(1)$ 的状态压缩技巧。\n\n### 前置知识\n\n- 「递归与递推式」（algo-l-1-3）；\n- 「哈希表与备忘录」（algo-l-4-1）。\n\n### 问题背景\n\n动态规划由应用数学大师理查德·贝尔曼（Richard Bellman）在 20 世纪 50 年代创立，是计算机科学中最具智慧、也是求职面试中最令人生畏的算法流派。许多看似只能用指数级 $O(2^N)$ 暴力搜索的爆炸性排列组合问题，在动态规划的「空间换时间、记录历史子问题」策略下，能以奇迹般的线性 $O(N)$ 或多项式级时间迎刃而解。\n\n### 直觉理解\n\n- **没有做备忘录的算数**：\n  你在黑板上写 `1 + 1 + 1 + 1 + 1`，问一个小朋友等于几，他数一数回答 `5`；\n  接着你在最左边加了一个 `1 +`，再问他等于几，聪明的小朋友瞬间答 `6`！\n  为什么他不用重新从头数一遍？因为他**记住了刚才那个子问题的答案是 5**！\n- **重叠子问题**：暴力求解 `fib(5)` 需要算 `fib(4)` 和 `fib(3)`；算 `fib(4)` 又要算 `fib(3)` 和 `fib(2)`。`fib(3)` 被重复算了两次！如果 $N=50$，递归树节点数高达 $2^{50} \\approx 10^{15}$，地球毁灭都算不完；\n- **最优子结构**：大问题的最优解可以由小问题的最优解推导得到（例如：从 A 经由 B 到 C 的最短路径，其中 A 到 B 的那一段也必然是 A 到 B 的最短路径）；\n- **无后效性**：一旦某个状态的值确定了，它未来如何被使用，不会反过来修改这个状态已经算好的数值。\n\n### 核心概念与原理详解\n\n## 动态规划解题四部曲\n\n1. **状态定义**：明确 $dp[i]$ 或 $dp[i][j]$ 的物理含义（如：达到第 $i$ 阶台阶的最小总花费）；\n2. **状态转移方程**：找出当前状态与前驱子状态之间的数学递推关系；\n3. **初始化与边界**：基础情况 $dp[0], dp[1]$ 的确定值；\n4. **遍历方向与空间压缩**：确定递推先后顺序，若当前状态仅依赖前两个状态，可用两个临时变量压缩到 $O(1)$ 空间。\n\n### 完整案例：使用最小花费爬楼梯\n\n数组 `cost`，`cost[i]` 是从楼梯第 $i$ 个台阶向上爬的费用。一旦支付了该费用，你可以选择向上爬一个或者两个台阶。\n- 状态定义：$dp[i]$ 表示到达第 $i$ 个台阶的最小累计花费；\n- 状态转移：到达第 $i$ 阶可以从第 $i-1$ 阶走一步上来，也可以从第 $i-2$ 阶走两步上来：\n  $$dp[i] = \\min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2])$$\n- 初始条件：从地面 0 或 1 阶起跳均无需额外到达费用：$dp[0] = 0, dp[1] = 0$。\n\n### 代码实践\n\n```python\n# 1. 记忆化搜索（自顶向下）\ndef climb_stairs_memo(cost):\n    memo = {}\n    def dfs(i):\n        if i <= 1: return 0\n        if i in memo: return memo[i]\n        memo[i] = min(dfs(i - 1) + cost[i - 1], dfs(i - 2) + cost[i - 2])\n        return memo[i]\n    return dfs(len(cost))\n\n# 2. 状态压缩迭代（自底向上：空间 O(1)）\ndef min_cost_climbing_stairs(cost):\n    n = len(cost)\n    prev2, prev1 = 0, 0\n    for i in range(2, n + 1):\n        curr = min(prev1 + cost[i - 1], prev2 + cost[i - 2])\n        prev2, prev1 = prev1, curr\n    return prev1\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 15 章：动态规划（钢条切割、矩阵链乘法原理）；\n- Bellman, R. (1957). *Dynamic Programming*. Princeton University Press。",
      "tips": [
        {
          "kind": "interview",
          "text": "面试答题秘籍：拿到 DP 题千万不要一上来就写二维递推表！先写出带 @functools.lru_cache 的递归暴搜，保证逻辑正确；然后再改成迭代 dp 数组，最后做空间压缩，思路极其稳健。"
        },
        {
          "kind": "pitfall",
          "text": "注意初始值的边界越界！定义 dp 数组长度是 n 还是 n + 1，取决于最终目标是到达下标 n-1 还是到达楼顶 n。"
        }
      ],
      "demos": [
        {
          "title": "斐波那契暴力递归 vs 记忆化 vs DP 性能对比",
          "lang": "python",
          "code": "import time\n\n# 1. 记忆化缓存\nmemo = {}\ndef fib_memo(n):\n    if n <= 1: return n\n    if n not in memo:\n        memo[n] = fib_memo(n - 1) + fib_memo(n - 2)\n    return memo[n]\n\n# 2. O(1) 空间递推\ndef fib_dp(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nt0 = time.perf_counter()\nres1 = fib_memo(35)\nt1 = time.perf_counter()\nres2 = fib_dp(35)\nt2 = time.perf_counter()\n\nprint(f\"fib(35) = {res1} | 记忆化耗时: {1000*(t1-t0):.3f} ms | DP递推耗时: {1000*(t2-t1):.3f} ms\")"
        }
      ]
    },
    {
      "id": "algo-l-8-2",
      "title": "经典背包问题与空间压缩推导",
      "difficulty": 4,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 严格推导 0-1 背包问题（每种物品最多选 1 件）的二维状态转移方程；\n2. 解释 0-1 背包降维为一维滚动数组时**必须逆序遍历容量**的数学原因；\n3. 准确阐述完全背包（每种物品可无限次选择）为何**必须正序遍历容量**，以及两者的内在本质联系。\n\n### 前置知识\n\n- 「动态规划三要素与记忆化搜索」（algo-l-8-1）。\n\n### 问题背景\n\n有一个容量为 $C$ 的背包和 $N$ 个物品，每个物品有对应的重量 $w[i]$ 和价值 $v[i]$。问如何装入物品使得背包内总价值最大？\n背包问题是运筹学与组合优化的核心模型，在云服务器弹性资源分配、量化投资组合预算装载、数据压缩等现实工程中有着极广泛的投射。\n\n### 直觉理解\n\n- **0-1 背包**：一件物品要么拿（1），要么不拿（0），不能切碎。面对第 $i$ 件物品，决策非常纯粹：\n  - 不拿它：背包能取得的最大价值，等于前 $i-1$ 件物品在当前容量下的最大价值；\n  - 拿它：必须腾出 $w[i]$ 的空间，总价值等于「前 $i-1$ 件物品在剩余容量 $j - w[i]$ 下的最大价值 + 当前物品价值 $v[i]$」。\n  两者取较大者即可！\n- **为什么一维压缩时 0-1 背包必须逆序**？\n  因为算 $dp[j]$ 需要用到上一层的 $dp[j - w[i]]$。如果从小到大正序算，$dp[j - w[i]]$ 会先被本轮计算覆盖更新（相当于该物品被拿了多次！）；只有从大到小逆序算，左边的较小容量状态依然完整保留着「上一轮未经污染」的历史值！\n- **完全背包为什么正序**？\n  完全背包物品可以无限次使用，恰恰需要让当前物品在前面已经拿过的状态上「重复再拿」，因此故意正序累加更新！\n\n### 核心概念与原理详解\n\n## 1. 0-1 背包二维状态转移\n\n定义 $dp[i][j]$ 为从前 $i$ 个物品中选择，背包容量不超过 $j$ 时的最大价值：\n$$dp[i][j] = \\begin{cases} dp[i-1][j], & j < w[i] \\\\ \\max(dp[i-1][j], dp[i-1][j - w[i]] + v[i]), & j \\ge w[i] \\end{cases}$$\n\n## 2. 空间降维压缩为一维数组\n\n观察转移方程：第 $i$ 行状态仅仅依赖第 $i-1$ 行。\n压缩为一维 $dp[j]$ 后：\n```python\n# 0-1 背包：容量逆序倒序遍历！\nfor i in range(len(weights)):\n    for j in range(capacity, weights[i] - 1, -1):\n        dp[j] = max(dp[j], dp[j - weights[i]] + values[i])\n```\n\n```python\n# 完全背包：容量正序遍历！\nfor i in range(len(weights)):\n    for j in range(weights[i], capacity + 1):\n        dp[j] = max(dp[j], dp[j - weights[i]] + values[i])\n```\n\n### 代码实践\n\n```python\n# 0-1 背包一维最优模板\ndef knapsack_01(capacity, weights, values):\n    dp = [0] * (capacity + 1)\n    for w, v in zip(weights, values):\n        for j in range(capacity, w - 1, -1): # 逆序保证每件物品只用一次\n            dp[j] = max(dp[j], dp[j - w] + v)\n    return dp[capacity]\n\n# 经典转换题：分割等和子集（LeetCode 416）\n# 能否将数组分割成两个和相等的子集？\n# 本质：是否存在若干元素，其和恰好等于 sum(nums) // 2（即背包容量为 target 的 0-1 背包）\ndef can_partition(nums):\n    total = sum(nums)\n    if total % 2 != 0: return False\n    target = total // 2\n    dp = [False] * (target + 1)\n    dp[0] = True\n    for x in nums:\n        for j in range(target, x - 1, -1):\n            dp[j] = dp[j] or dp[j - x]\n    return dp[target]\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 练习 16.2-2：0-1 背包问题动态规划推导；\n- 崔添翼《背包九讲》。",
      "tips": [
        {
          "kind": "interview",
          "text": "常见模型转换：若题目问「装满背包的最少硬币数」（零钱兑换），状态转移取 min，初始化全部为 float('inf') 且 dp[0] = 0。"
        },
        {
          "kind": "pitfall",
          "text": "遍历容量的终止条件是 `weights[i] - 1`（在倒序 range 时表示到 `weights[i]` 截止），如果容量小于物品自身重量，根本装不下，直接沿用原值无需计算。"
        }
      ],
      "demos": [
        {
          "title": "0-1 背包状态转移打表全过程展示",
          "lang": "python",
          "code": "weights = [2, 3, 4]\nvalues = [3, 4, 5]\ncapacity = 5\n\ndp = [0] * (capacity + 1)\nprint(\"初始状态:\", dp)\n\nfor idx, (w, v) in enumerate(zip(weights, values)):\n    for j in range(capacity, w - 1, -1):\n        dp[j] = max(dp[j], dp[j - w] + v)\n    print(f\"放入第 {idx+1} 个物品(重{w},值{v})后 DP 表:\", dp)\n\nprint(\"容量 5 的最大可容纳价值:\", dp[capacity])"
        }
      ]
    },
    {
      "id": "algo-l-8-3",
      "title": "序列型动态规划与最长公共子序列（LCS/LIS）",
      "difficulty": 4,
      "content": "### 学习目标\n\n学完本节，你应该能够：\n1. 掌握序列型 DP 的经典状态定义技巧（以 $i$ 结尾的最优解）；\n2. 手写最长递增子序列（LIS）的 $O(N^2)$ 动态规划解法与贪心二分 $O(N \\log N)$ 优化原理；\n3. 掌握双串匹配模型（最长公共子序列 LCS 与 Levenshtein 编辑距离）的二维网格转移推导。\n\n### 前置知识\n\n- 「动态规划三要素与记忆化搜索」（algo-l-8-1）；\n- 「二分查找左右边界」（algo-l-2-3）。\n\n### 问题背景\n\n字符串对比（Git 的 `git diff` 算法原理）、自然语言处理中的拼写纠错（莱文斯坦距离）、生物信息学中的 DNA 基因序列比对（Needleman-Wunsch 算法）底层全部依托于双串动态规划。\n\n### 直觉理解\n\n- **单串最长递增子序列（LIS）**：\n  站在每一个数字 $nums[i]$ 视角向左回顾：在之前所有比自己小的数字 $nums[j]$ 里，谁接上自己后能拼出最长的一串？\n  $$dp[i] = \\max(dp[j]) + 1, \\quad \\forall j < i \\text{ 且 } nums[j] < nums[i]$$\n- **双串最长公共子序列（LCS）**：\n  一张网格纸，横轴是字符串 `text1`，纵轴是 `text2`。\n  如果两个字符相同 `text1[i] == text2[j]`，直接从左上角继承长度加 1（对角线移动）；\n  如果不同，就看「退回 text1 的前一个字符」还是「退回 text2 的前一个字符」谁保留的公共序列更长。\n\n### 代码实践\n\n```python\n# 1. 最长递增子序列 (LIS: O(N^2))\ndef length_of_lis(nums):\n    if not nums: return 0\n    dp = [1] * len(nums)\n    for i in range(len(nums)):\n        for j in range(i):\n            if nums[j] < nums[i]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp)\n\n# 2. 最长公共子序列 (LCS: O(M * N))\ndef longest_common_subsequence(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if text1[i - 1] == text2[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1] + 1\n            else:\n                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n    return dp[m][n]\n```\n\n### 权威参考来源\n\n- 《算法导论》(CLRS) 第 15.4 节：最长公共子序列 (LCS)；\n- LeetCode 300: Longest Increasing Subsequence；LeetCode 72: Edit Distance。",
      "tips": [
        {
          "kind": "interview",
          "text": "进阶：LIS 可以在 O(N log N) 时间内求解！利用 tails 数组维护长度为 i 的递增子序列末尾最小元素，结合二分查找更新。"
        },
        {
          "kind": "performance",
          "text": "双串 DP 空间压缩：dp[i][j] 仅依赖上一行与当前行，可以用两行滚动数组或一行+一个临时变量 pre 压缩空间至 O(min(M, N))。"
        }
      ],
      "demos": [
        {
          "title": "LCS 双串二维 DP 网格演化演示",
          "lang": "python",
          "code": "s1 = \"abcde\"\ns2 = \"ace\"\nm, n = len(s1), len(s2)\n\ndp = [[0]*(n+1) for _ in range(m+1)]\nfor i in range(1, m+1):\n    for j in range(1, n+1):\n        if s1[i-1] == s2[j-1]:\n            dp[i][j] = dp[i-1][j-1] + 1\n        else:\n            dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n\nprint(f\"'{s1}' 与 '{s2}' 的 LCS 长度:\", dp[m][n])"
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "algo-8-e1",
      "type": "single",
      "difficulty": 1,
      "question": "动态规划算法之所以能够将指数级暴力搜索复杂度降低为多项式级，根本原因在于利用备忘录消除了：",
      "options": [
        {
          "value": "A",
          "text": "重叠子问题的重复计算"
        },
        {
          "value": "B",
          "text": "贪心选择性质"
        },
        {
          "value": "C",
          "text": "最优子结构"
        },
        {
          "value": "D",
          "text": "无后效性"
        }
      ],
      "answer": "A",
      "explanation": "【解题思路】动态规划通过「以空间换时间」的策略，将已经求解过的子问题的答案保存在表格（备忘录）中，彻底消除了重叠子问题的大量重复递归展开。",
      "relatedLessonId": "algo-l-8-1",
      "tags": [
        "DP本质",
        "重叠子问题"
      ]
    },
    {
      "id": "algo-8-e2",
      "type": "judge",
      "difficulty": 2,
      "question": "在利用一维滚动数组求解 0-1 背包问题时，容量遍历必须采用从大到小的倒序（逆序）遍历，以确保每件物品最多只被选择一次。",
      "answer": true,
      "explanation": "【解题思路】正确。倒序遍历可以保证在计算当前较大容量状态时，所引用的较小容量状态仍是「上一层（上一件物品）」未经污染的历史值，从而严格防止单件物品被重复放入。",
      "relatedLessonId": "algo-l-8-2",
      "tags": [
        "0-1背包",
        "逆序遍历"
      ]
    },
    {
      "id": "algo-8-e3",
      "type": "single",
      "difficulty": 2,
      "question": "在最长递增子序列（LIS）的经典状态定义中，通常定义 `dp[i]` 为：",
      "options": [
        {
          "value": "A",
          "text": "前 i 个元素中最长递增子序列的长度"
        },
        {
          "value": "B",
          "text": "以 nums[i] 为结尾的最长递增子序列的长度"
        },
        {
          "value": "C",
          "text": "以 nums[0] 到 nums[i] 中最小值为开头的子序列长度"
        },
        {
          "value": "D",
          "text": "整个数组的递增子序列总个数"
        }
      ],
      "answer": "B",
      "explanation": "【解题思路】单串序列型 DP 的经典破局状态定义是以 nums[i] 结尾的最优解。只有明确以当前元素结尾，后续元素 nums[k]（k > i）在进行大小比较时才有清晰的锚点。",
      "relatedLessonId": "algo-l-8-3",
      "tags": [
        "LIS",
        "状态定义"
      ]
    },
    {
      "id": "algo-8-e4",
      "type": "multiple",
      "difficulty": 2,
      "question": "下列哪些问题属于可以转化为背包模型的经典动态规划问题？（多选）",
      "options": [
        {
          "value": "A",
          "text": "分割等和子集（判断能否将数组划分为两个和相等的集合）"
        },
        {
          "value": "B",
          "text": "零钱兑换（凑齐目标金额所需的最少硬币数）"
        },
        {
          "value": "C",
          "text": "目标和（在每个数字前添加正负号使其和为目标值）"
        },
        {
          "value": "D",
          "text": "二叉树的最近公共祖先"
        }
      ],
      "answer": [
        "A",
        "B",
        "C"
      ],
      "explanation": "【解题思路】A 为装满容量为 sum/2 的 0-1 背包；B 为完全背包求最值；C 通过代数变换 pos = (sum + target)/2 转化为 0-1 背包组合问题。D 属于树形后序遍历问题，非背包模型。",
      "relatedLessonId": "algo-l-8-2",
      "tags": [
        "背包模型转换"
      ]
    },
    {
      "id": "algo-8-e5",
      "type": "fill",
      "difficulty": 2,
      "question": "某状态一旦确定，其后的所有决策过程都不会反向影响该状态过去的演变，这一动态规划关键成立前提被称为 ___（填四个字）。",
      "blanks": [
        [
          "无后效性"
        ]
      ],
      "explanation": "【解题思路】无后效性（Markovian property / 过程无记忆性）保证了局部最优决策的稳定性，是动态规划递推方程成立的根基。",
      "relatedLessonId": "algo-l-8-1",
      "tags": [
        "无后效性"
      ]
    },
    {
      "id": "algo-8-e6",
      "type": "judge",
      "difficulty": 2,
      "question": "完全背包与 0-1 背包的核心区别在于完全背包的每种物品有无限件可用，因此其一维空间压缩递推时，容量必须采用从小到大的正序遍历。",
      "answer": true,
      "explanation": "【解题思路】正确。正序遍历恰好允许同一件物品在当前阶段被连续多次累计放入，完美契合「无限次可用」的模型约束。",
      "relatedLessonId": "algo-l-8-2",
      "tags": [
        "完全背包",
        "正序遍历"
      ]
    },
    {
      "id": "algo-8-e7",
      "type": "code",
      "difficulty": 2,
      "question": "编写函数 min_cost_climbing_stairs(cost)，输入整数数组 cost，计算到达楼梯顶部的最低花费。\n\n你可以在支付了 cost[i] 后选择向上爬一个或者两个台阶。你可以选择从下标为 0 或 1 的台阶开始爬，楼梯顶部位于下标 len(cost) 处。空间复杂度要求为 O(1)。",
      "starterCode": "def min_cost_climbing_stairs(cost):\n    pass\n",
      "expectedOutput": "最低花费整数",
      "tests": "assert min_cost_climbing_stairs([10, 15, 20]) == 15\nassert min_cost_climbing_stairs([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]) == 6\nassert min_cost_climbing_stairs([0, 0, 0, 0]) == 0",
      "answer": "def min_cost_climbing_stairs(cost):\n    n = len(cost)\n    prev2, prev1 = 0, 0\n    for i in range(2, n + 1):\n        curr = min(prev1 + cost[i - 1], prev2 + cost[i - 2])\n        prev2, prev1 = prev1, curr\n    return prev1\n\nmin_cost_climbing_stairs([10, 15, 20])",
      "explanation": "【解题思路与进阶】\n1. 状态定义：dp[i] 表示到达第 i 阶台阶的最小花费；\n2. 转移方程：dp[i] = min(dp[i-1] + cost[i-1], dp[i-2] + cost[i-2])；\n3. 滚动变量优化：dp[i] 仅依赖前两项，用两个变量 prev1 和 prev2 交替滑动，空间降至 O(1)。",
      "relatedLessonId": "algo-l-8-1",
      "tags": [
        "动态规划",
        "状态压缩",
        "Python编程"
      ]
    },
    {
      "id": "algo-8-e8",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 knapsack_01(capacity, weights, values)，使用一维空间压缩的动态规划算法，计算容量为 capacity 的背包能够装入物品的最大价值。\n\nweights 与 values 为等长列表，分别代表各物品的重量和价值。每件物品只能选择 0 次或 1 次。",
      "starterCode": "def knapsack_01(capacity, weights, values):\n    pass\n",
      "expectedOutput": "最大价值整数",
      "tests": "assert knapsack_01(4, [1, 2, 3], [10, 20, 30]) == 40\nassert knapsack_01(5, [2, 3, 4], [3, 4, 5]) == 7\nassert knapsack_01(0, [1, 2], [10, 20]) == 0",
      "answer": "def knapsack_01(capacity, weights, values):\n    dp = [0] * (capacity + 1)\n    for w, v in zip(weights, values):\n        for j in range(capacity, w - 1, -1):\n            dp[j] = max(dp[j], dp[j - w] + v)\n    return dp[capacity]\n\nknapsack_01(4, [1, 2, 3], [10, 20, 30])",
      "explanation": "【解题思路与进阶】\n1. 0-1 背包的核心是一维滚动数组下容量逆序倒退遍历；\n2. 逆序确保了计算 dp[j] 时，dp[j-w] 尚未被更新，仍是上一件物品的结果；\n3. 时间复杂度 O(N * capacity)，空间复杂度仅为 O(capacity)。",
      "relatedLessonId": "algo-l-8-2",
      "tags": [
        "0-1背包",
        "动态规划",
        "Python编程"
      ]
    },
    {
      "id": "algo-8-e9",
      "type": "code",
      "difficulty": 3,
      "question": "编写函数 length_of_lis(nums)，计算整数数组 nums 中最长严格递增子序列（LIS）的长度。子序列不需要在原数组中连续。",
      "starterCode": "def length_of_lis(nums):\n    pass\n",
      "expectedOutput": "最长递增子序列长度整数",
      "tests": "assert length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]) == 4\nassert length_of_lis([0, 1, 0, 3, 2, 3]) == 4\nassert length_of_lis([7, 7, 7, 7, 7]) == 1\nassert length_of_lis([]) == 0",
      "answer": "def length_of_lis(nums):\n    if not nums:\n        return 0\n    dp = [1] * len(nums)\n    for i in range(len(nums)):\n        for j in range(i):\n            if nums[j] < nums[i]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp)\n\nlength_of_lis([10, 9, 2, 5, 3, 7, 101, 18])",
      "explanation": "【解题思路与进阶】\n1. 状态定义：dp[i] 表示以 nums[i] 结尾的最长严格递增子序列长度，初始全为 1；\n2. 转移方程：遍历所有 j < i，若 nums[j] < nums[i]，则 dp[i] = max(dp[i], dp[j] + 1)；\n3. 最终答案为 max(dp)；时间复杂度 O(N^2)。",
      "relatedLessonId": "algo-l-8-3",
      "tags": [
        "LIS",
        "动态规划",
        "Python编程"
      ]
    }
  ]
}
];
