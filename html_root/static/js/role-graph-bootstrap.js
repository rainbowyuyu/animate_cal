// 为 Vue 版本提供全局 RoleGraph，复用原有 3D 知识图谱实现
// 只暴露需要的函数，使用可扩展的普通对象，避免 ES Module namespace 不可扩展的问题
import * as RoleGraphModule from "./role-graph.js";

// 挂到 window，供 HomePage 等组件调用 window.RoleGraph.initRoleGraph()
window.RoleGraph = {
  initRoleGraph: RoleGraphModule.initRoleGraph
};

