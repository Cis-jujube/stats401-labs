// 1. 读取 CSV，读完以后执行里面的代码
d3.csv("../data/students.csv").then(data => {

    // 2. 把每个学生的分数转换成数字
    data.forEach(d => {
        d.score = +d.score;
    });

    // 3. 在网页的 chart 容器里创建画布
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", 800)
        .attr("height", 260);

    // 4. 一个学生画一根柱子
    svg.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", (d, i) => 20 + i * 90)
        .attr("y", d => 200 - d.score * 2)
        .attr("width", 60)
        .attr("height", d => d.score * 2)
        .attr("fill", "steelblue");

    // 5. 在柱子下面显示姓名和分数
    svg.selectAll("text")
        .data(data)
        .join("text")
        .attr("x", (d, i) => 20 + i * 90)
        .attr("y", 230)
        .text(d => d.name + " " + d.score);

    // 6. 清除你网页上已有的 Loading 提示
    d3.select("#chart-status").text("");

});