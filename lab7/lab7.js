/* Lab 7: each frame is one day's undirected commercial relationships. */
(async function () {
    const money = d3.format('$,.2f');
    const shortMoney = d3.format('$,.0f');
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatDate = d3.timeFormat('%b %d, %Y');
    const tooltip = d3.select('#tooltip');
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
    let timer = null;
    let currentDay = 1;

    function hideTooltip() { tooltip.property('hidden', true); }
    function inspect(event, text) {
        tooltip.text(text).property('hidden', false);
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX || bounds.x + bounds.width / 2;
        const y = event.clientY || bounds.y + bounds.height / 2;
        const box = tooltip.node().getBoundingClientRect();
        tooltip.style('left', `${Math.max(8, Math.min(x + 14, innerWidth - box.width - 8))}px`)
            .style('top', `${Math.max(8, Math.min(y + 14, innerHeight - box.height - 8))}px`);
    }
    function bindTooltip(selection, text) {
        selection.on('pointerenter pointermove focus click', (event, d) => inspect(event, text(d)))
            .on('pointerleave blur', hideTooltip)
            .on('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
    }

    try {
        const [companies, transactions] = await Promise.all([
            d3.csv('../data/lab7_assignment_companies.csv'),
            d3.csv('../data/lab7_assignment_transactions_60days.csv', d => ({
                ...d, date: parseDate(d.date), day: +d.day,
                amount_usd: +d.amount_usd, transaction_count: +d.transaction_count,
                key: [d.source, d.target].sort().join('-')
            }))
        ]);
        const companyById = new Map(companies.map(d => [d.id, d]));
        if (companies.length !== 12 || transactions.some(d => !d.date ||
            !Number.isInteger(d.day) || d.day < 1 || d.day > 60 ||
            !companyById.has(d.source) || !companyById.has(d.target) ||
            !Number.isFinite(d.amount_usd) || d.amount_usd < 0 ||
            !Number.isInteger(d.transaction_count) || d.transaction_count < 1)) {
            throw new Error('Unexpected dataset structure.');
        }
        const frames = d3.range(1, 61).map(day => {
            const links = transactions.filter(d => d.day === day);
            if (!links.length || new Set(links.map(d => d.key)).size !== links.length) {
                throw new Error('Missing day or repeated daily relationship.');
            }
            const volume = new Map(companies.map(d => [d.id, 0]));
            const neighbors = new Map(companies.map(d => [d.id, new Set()]));
            links.forEach(d => {
                volume.set(d.source, volume.get(d.source) + d.amount_usd);
                volume.set(d.target, volume.get(d.target) + d.amount_usd);
                neighbors.get(d.source).add(d.target);
                neighbors.get(d.target).add(d.source);
            });
            const visited = new Set();
            let components = 0;
            companies.forEach(company => {
                if (visited.has(company.id)) return;
                components++;
                const stack = [company.id];
                while (stack.length) {
                    const id = stack.pop();
                    if (visited.has(id)) continue;
                    visited.add(id);
                    neighbors.get(id).forEach(n => stack.push(n));
                }
            });
            return { day, date: links[0].date, links, volume, neighbors, components,
                active: [...neighbors.values()].filter(d => d.size > 0).length,
                total: d3.sum(links, d => d.amount_usd),
                cross: links.filter(d => companyById.get(d.source).region !== companyById.get(d.target).region).length };
        });
        const sector = d3.scaleOrdinal([...new Set(companies.map(d => d.sector))], d3.schemeTableau10);
        const type = d3.scaleOrdinal([...new Set(transactions.map(d => d.transaction_type))].sort(),
            ['#176a8a', '#b66b16', '#8662a6', '#347e58', '#c05566']);
        const maxVolume = d3.max(frames, f => d3.max([...f.volume.values()]));
        // Squared radius is linear in value, with a small visible baseline for inactive nodes.
        const radius = value => Math.sqrt(7 * 7 + value / maxVolume * (27 * 27 - 7 * 7));
        const maxAmount = d3.max(transactions, d => d.amount_usd);
        const linkWidth = d3.scaleLinear([0, maxAmount], [1.5, 8]);
        for (const [id, scale] of [['#sector-legend', sector], ['#type-legend', type]]) {
            const items = d3.select(id).selectAll('span.legend-item').data(scale.domain()).join('span').attr('class', 'legend-item');
            items.append('span').attr('class', 'swatch').style('background', d => scale(d));
            items.append('span').text(d => d);
        }
        d3.select('#size-legend').text(`Node radius: 7 px at $0 → 27 px at ${shortMoney(maxVolume)} daily incident value. Link width: 1.5 px at $0 → 8 px at ${shortMoney(maxAmount)}. Degree = number of partners today. Cross-region share = cross-region links ÷ all active links.`);

        const width = 940, height = 570;
        const svg = d3.select('#network').append('svg').attr('viewBox', `0 0 ${width} ${height}`)
            .attr('aria-label', 'Animated company network');
        svg.append('title').text('Daily undirected commercial relationships');
        const linkGroup = svg.append('g');
        const nodes = companies.map((d, i) => ({ ...d,
            anchorX: width / 2 + 325 * Math.cos(i * Math.PI * 2 / companies.length - Math.PI / 2),
            anchorY: height / 2 + 205 * Math.sin(i * Math.PI * 2 / companies.length - Math.PI / 2)
        }));
        nodes.forEach(d => { d.x = d.anchorX; d.y = d.anchorY; });
        const node = svg.append('g').selectAll('g').data(nodes, d => d.id).join('g')
            .attr('class', 'node').attr('tabindex', 0).attr('role', 'img');
        node.append('circle').attr('fill', d => sector(d.sector));
        node.append('text').attr('text-anchor', 'middle').text(d => d.company_name);
        // Reuse these node objects and this single simulation across every frame.
        const forceLink = d3.forceLink().id(d => d.id).distance(170).strength(0.015);
        const simulation = d3.forceSimulation(nodes)
            .force('link', forceLink)
            .force('charge', d3.forceManyBody().strength(-80))
            .force('x', d3.forceX(d => d.anchorX).strength(0.8))
            .force('y', d3.forceY(d => d.anchorY).strength(0.8))
            .force('collision', d3.forceCollide(46)).alphaDecay(0.08);
        function tick() {
            node.attr('transform', d => `translate(${d.x},${d.y})`);
            linkGroup.selectAll('line').attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        }
        simulation.on('tick', tick);
        const overview = d3.select('#overview').append('svg').attr('viewBox', '0 0 940 210');
        const x = d3.scaleLinear([1, 60], [45, 915]);
        const y = d3.scaleLinear([0, d3.max(frames, f => f.links.length) + 1], [170, 20]);
        overview.append('g').attr('transform', 'translate(0,170)').call(d3.axisBottom(x).tickValues([1, 10, 20, 30, 40, 50, 60]).tickFormat(d => `Day ${d}`));
        overview.append('g').attr('transform', 'translate(45,0)').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')));
        overview.append('path').datum(frames).attr('fill', 'none').attr('stroke', '#235c89').attr('stroke-width', 2)
            .attr('d', d3.line().x(f => x(f.day)).y(f => y(f.links.length)));
        const cursor = overview.append('line').attr('y1', 15).attr('y2', 170).attr('stroke', '#c05566').attr('stroke-dasharray', '4 3');
        const dot = overview.append('circle').attr('r', 5).attr('fill', '#c05566');

        function pause() {
            if (timer) timer.stop();
            timer = null;
            d3.select('#play').property('disabled', false);
            d3.select('#pause').property('disabled', true);
        }
        function showDay(day) {
            currentDay = day;
            hideTooltip();
            const frame = frames[day - 1];
            d3.select('#current-day').text(`Day ${day} / 60 · ${formatDate(frame.date)}`);
            d3.select('#time-slider').property('value', day).attr('aria-valuetext', `Day ${day}, ${formatDate(frame.date)}`);
            const summaries = [[frame.active, 'Active companies'], [frame.links.length, 'Active links'],
                [shortMoney(frame.total), 'Daily value'], [frame.components, 'Components'],
                [d3.format('.0%')(frame.cross / frame.links.length), 'Cross-region links']];
            d3.select('#summary').selectAll('div').data(summaries).join('div').each(function (d) {
                d3.select(this).selectAll('*').remove();
                d3.select(this).append('strong').text(d[0]);
                d3.select(this).append('span').text(d[1]);
            });
            // forceLink mutates endpoints: pass copies and keep original CSV rows untouched.
            const currentLinks = frame.links.map(d => ({ ...d }));
            forceLink.links(currentLinks);
            linkGroup.selectAll('line').interrupt();
            const links = linkGroup.selectAll('line').data(currentLinks, d => d.key).join(
                enter => enter.append('line').attr('class', 'link').attr('opacity', 0),
                update => update,
                exit => exit.attr('tabindex', null).style('pointer-events', 'none')
                    .transition().duration(duration).attr('opacity', 0).remove()
            ).attr('tabindex', 0).style('pointer-events', 'stroke').attr('role', 'img')
                .attr('stroke', d => type(d.transaction_type)).attr('stroke-width', d => linkWidth(d.amount_usd));
            const linkText = d => `${d.source.company_name} ↔ ${d.target.company_name}\n${formatDate(frame.date)} · ${d.transaction_type}\nAmount: ${money(d.amount_usd)}\nTransactions: ${d.transaction_count}`;
            links.attr('aria-label', linkText);
            bindTooltip(links, linkText);
            links.transition().duration(duration).attr('opacity', 0.75);
            node.select('circle').interrupt().transition().duration(duration).attr('r', d => radius(frame.volume.get(d.id)));
            node.select('text').attr('dy', d => radius(frame.volume.get(d.id)) + 17);
            const nodeText = d => `${d.company_name}\nSector: ${d.sector} · Region: ${d.region}\n${formatDate(frame.date)}\nDaily incident value: ${money(frame.volume.get(d.id))}\nDegree: ${frame.neighbors.get(d.id).size}`;
            node.attr('aria-label', nodeText);
            bindTooltip(node, nodeText);
            tick();
            simulation.alpha(0.15).restart();
            cursor.attr('x1', x(day)).attr('x2', x(day));
            dot.attr('cx', x(day)).attr('cy', y(frame.links.length));
            d3.select('#table-caption').text(`Day ${day} · ${formatDate(frame.date)} · ${frame.links.length} relationships`);
            const rows = d3.select('#transactions').selectAll('tr').data(frame.links, d => d.key).join('tr');
            rows.selectAll('td').data(d => [companyById.get(d.source).company_name, companyById.get(d.target).company_name,
                d.transaction_type, money(d.amount_usd), d.transaction_count]).join('td').text(d => d);
        }
        d3.select('#play').on('click', () => {
            if (timer) return;
            if (currentDay === 60) showDay(1);
            d3.select('#play').property('disabled', true);
            d3.select('#pause').property('disabled', false);
            timer = d3.interval(() => {
                showDay(currentDay + 1);
                if (currentDay === 60) pause();
            }, 900);
        });
        d3.select('#pause').on('click', pause);
        d3.select('#reset').on('click', () => { pause(); showDay(1); });
        d3.select('#time-slider').on('input', function () { pause(); showDay(+this.value); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

        // Calculate the period summaries used by the written answers from the same frames.
        const periods = [frames.slice(0, 20), frames.slice(20, 40), frames.slice(40, 60)];
        const avgLinks = periods.map(p => d3.format('.2f')(d3.mean(p, f => f.links.length)));
        const crossShares = periods.map(p => d3.format('.1%')(d3.sum(p, f => f.cross) / d3.sum(p, f => f.links.length)));
        const leaders = periods.map(p => companies.map(c => ({ name: c.company_name,
            value: d3.sum(p, f => f.volume.get(c.id)) })).sort((a, b) => b.value - a.value)[0]);
        const pairDays = (a, b) => transactions.filter(d => d.key === [a, b].sort().join('-')).map(d => d.day);
        const example = pairDays('c06', 'c09');
        const answers = [
            ['1. How does overall connectivity change?', `Average daily active links rise from ${avgLinks[0]} (days 1–20) to ${avgLinks[1]} (21–40) and ${avgLinks[2]} (41–60). Day 1 has ${frames[0].links.length} links and ${frames[0].components} components, while day 60 has ${frames[59].links.length} links and ${frames[59].components} components. The network is generally more connected late in the period, but daily fluctuations mean growth is not monotonic.`],
            ['2. Which companies become more active?', `The largest incident transaction totals in the three periods are ${leaders.map((d, i) => `${i + 1}: ${d.name} (${money(d.value)})`).join('; ')}. Fusion Electronics is especially active in the middle period, while Ion Systems leads the final period. Node size shows daily commercial activity; degree in the tooltip gives a separate count of current partners. High transaction volume alone does not establish high betweenness or other centrality.`],
            ['3. Are there relatively separate clusters?', `Yes. Day 1 has three separate connected pairs and six isolated companies (nine components). Days 20, 40, and 60 have ${frames[19].components}, ${frames[39].components}, and ${frames[59].components} components respectively. Even late snapshots can remain disconnected. Read clusters from the links and component count: the anchored layout does not use physical distance as a measure of connectivity.`],
            ['4. Which relationships change?', `For example, Fusion Electronics–Ion Systems appears on days ${example.join(', ')} and is absent on other days. Use the slider to compare adjacent days and observe its entering and exiting link. Its changing width shows changing daily value. The strongest relationship by total value shifts from Harbor Shipping–Keystone Materials in days 1–20 ($152,513.47), to Fusion Electronics–Granite Wholesale in days 21–40 ($250,034.02), to Fusion Electronics–Ion Systems in days 41–60 ($300,579.60). Period totals describe repeated activity, not a continuously present link.`],
            ['5. Does the network become more cross-regional?', `The proportion of active link observations connecting different regions is ${crossShares[0]}, ${crossShares[1]}, and ${crossShares[2]} across the three periods. Cross-regional activity is more common in the final period, with little change between the first two. These percentages count each active pair once per day; they are neither the share of unique pairs across the whole period nor an amount-weighted measure. Regions are available in company tooltips.`]
        ];
        const answer = d3.select('#answers').selectAll('article').data(answers).join('article');
        answer.append('h3').text(d => d[0]);
        answer.append('p').text(d => d[1]);
        d3.select('#controls').property('disabled', false);
        pause();
        showDay(1);
        d3.select('#status').text(`Loaded ${companies.length} companies and ${transactions.length} transaction records across 60 days.`);
    } catch (error) {
        if (timer) timer.stop();
        d3.select('#controls').property('disabled', true);
        d3.select('#status').text('Could not load the visualization. Reload the page or use the CSV links above.');
        console.error(error);
    }
})();
