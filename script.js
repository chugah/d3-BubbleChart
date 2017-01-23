(function() {
  var margin = {top: 20, right: 95, bottom: 10, left: 125},
      width = 1200 - margin.left - margin.right,
      height,
      tickExtension = 20; 

  var formatPercent = d3.format(".2%"),
      formatTenthPercent = d3.format(".1%"),
      formatNumber = d3.format(",.3s"),
      formatDollars = function(d) { return (d < 0 ? "-" : "") + "$" + formatNumber(Math.abs(d)) };

  var nameAll = "";

  var x = d3.scale.linear()
      .domain([0, .6])
      .rangeRound([0, width - 60])
      .clamp(true)
      .nice();

  var y = d3.scale.ordinal();

  var y0 = d3.scale.ordinal()
      .domain([nameAll])
      .range([150]);

  var r = d3.scale.sqrt()
      .domain([0, 1e9])
      .range([0, 1]);

  var z = d3.scale.threshold()
      .domain([.001, .002, .003, .004, .005])
      .range(["#b35806", "#f1a340", "#fee0b6", "#d8daeb", "#998ec3", "#542788"].reverse());

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("top")
      .ticks(5)
     .tickFormat(formatPercent);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickSize(-width + 60 - tickExtension * 2, 0)
      .tickPadding(6);

  var quadtree = d3.geom.quadtree()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

  var svg = d3.select(".g-graphic").append("svg")
      .attr("height", 850 + margin.top + margin.bottom)
      .attr("width", width + margin.left + margin.right)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.select(".g-graphic").append("svg")
      .style("margin-top", "20px")
      .attr("height", 80)
      .attr("width", width + margin.left + margin.right)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(renderChartKey);

  var gx = svg.append("g")

  var tickLast = gx.selectAll(".g-x .tick:last-of-type");

  d3.tsv("/companies.tsv", type, function(error, companies) {
    var sectors = d3.nest()
        .key(function(d) { return d.sector; })
        .entries(companies);

    // Compute the overall rate for all data.
    var overallRate = rate(d3.sum(companies, taxes), d3.sum(companies, earnings));  

    // Compute the overall rate by sector.
    sectors.forEach(function(d) {
      d.rate = rate(d3.sum(d.values, taxes), d3.sum(d.values, earnings));  
    });

    // Sort sectors by ascending overall rate.
    sectors.sort(function(a, b) {
      return a.rate - b.rate;
    });

    // Compute the rate for each company.  
    companies.forEach(function(d) {
      d.rate = rate(d.taxes, d.earnings);
    });

    height = 120 * sectors.length;  

    y  
        .domain(sectors.map(function(d) { return d.key; }))  
        .rangePoints([10, height], 1);

    svg.append("g") 
        .attr("class", "g-y g-axis g-y-axis-sector")  
        .attr("transform", "translate(-" + tickExtension + ",0)")
        .call(yAxis.scale(y))
        .call(yAxisWrap)
        .style("stroke-opacity", 0)
        .style("fill-opacity", 0)
      .selectAll(".tick text,.tick tspan")
        .attr("x", -95)
        .style("text-anchor", "start");

    svg.append("g")
       .attr("class", "g-y g-axis g-y-axis-overall")
        .attr("transform", "translate(-" + tickExtension + ",0)")
        .call(yAxis.scale(y0))
        .call(yAxisWrap);

    var companyClip = svg.append("defs").selectAll("clipPath")
        .data(companies)
      .enter().append("clipPath")
        .attr("id", function(d, i) { return "g-clip-company-" + i; })
      .append("circle")
        .attr("cx", function(d) { return d.cx; })
        .attr("cy", function(d) { return d.cy - y0(nameAll); })
        .attr("r", function(d) { return r(d.capitalization) + 20; });

    var gVoronoi = svg.append("g")
        .attr("class", "g-voronoi")

    gVoronoi.selectAll("path")
        .data(companies)
      .enter().append("path")
        .attr("clip-path", function(d, i) { return "url(#g-clip-company-" + i + ")"; })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    gVoronoi.call(updateVoronoi,
        function(d) { return d.cx; },
        function(d) { return d.cy + y0(nameAll); },
        420);

    var sector = svg.append("g")
        .attr("class", "g-sector")
      .selectAll("g")
        .data(sectors)
      .enter().append("g")
        .attr("transform", function(d) { return "translate(0," + y(d.key) + ")"; });

    var sectorNote = d3.select(".g-sector-notes")
        .style("opacity", 0)
        .style("display", "none")
      .selectAll("div")
        .data(sectors)
      .enter().append("div")
        .attr("class", "g-sector-note")
        .style("top", function(d) { return y(d.key) + "px"; })
        .html(function(d) { return sectorNoteByName[d.key]; });

    var sectorCompany = sector.append("g")
        .attr("class", "g-sector-company")
      .selectAll("circle")
        .data(function(d) { return d.values; })
      .enter().append("circle")
        .attr("cx", function(d) { return d.cx; })
        .attr("cy", function(d) { return d.cy - y(d.sector) + y0(nameAll); })
        .attr("r", function(d) { return r(d.capitalization); })
        .style("fill", function(d) { return isNaN(d.rate) ? null : z(d.rate); })
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    var sectorOverall = sector.append("g")
        .attr("class", "g-overall")
        .attr("transform", function(d) { return "translate(" + x(d.rate) + "," + (y0(nameAll) - y(d.key)) + ")"; })
        .style("stroke-opacity", 0)
        .style("fill-opacity", 0);

    var sectorOverallText = sectorOverall.append("text")

    sectorOverallText.append("tspan")

    sectorOverallText.filter(function(d, i) { return !i; }).append("tspan")
        .attr("x", 0)
        .attr("dy", "-11")

    var overall = svg.append("g")

    overall.append("line")

    var overallText = overall.append("text")

    overallText.append("tspan")

    overallText.append("tspan")

    var currentView = "overall";

    d3.selectAll(".g-content button[data-view]")
        .datum(function(d) { return this.getAttribute("data-view"); })
        .on("click", transitionView);

    var searchInput = d3.select(".g-search input")
        .on("keyup", keyuped);

    var searchClear = d3.select(".g-search .g-search-clear")
        .on("click", function() {
          searchInput.property("value", "").node().blur();
          search();
        });

    var tip = d3.select(".g-tip");

    var tipMetric = tip.selectAll(".g-tip-metric")
        .datum(function() { return this.getAttribute("data-name"); });

    d3.selectAll(".g-annotations b,.g-sector-notes b")
        .datum(function() { return new RegExp("\\b" + d3.requote(this.textContent), "i"); })
        .on("mouseover", mouseoverAnnotation)
        .on("mouseout", mouseout);

    function keyuped() {
      if (d3.event.keyCode === 27) {
        this.value = "";
        this.blur();
      }
      search(this.value.trim());
    }

    function search(value) {
      if (value) {
        var re = new RegExp("\\b" + d3.requote(value), "i");
        svg.classed("g-searching", true);
        sectorCompany.classed("g-match", function(d) { return re.test(d.name) || re.test(d.sector) || (d.symbol && re.test(d.symbol)) || (d.alias && re.test(d.alias)); });
        var matches = d3.selectAll(".g-match");
        if (matches[0].length === 1) mouseover(matches.datum());
        else mouseout();
        searchClear.style("display", null);
      } else {
        mouseout();
        svg.classed("g-searching", false);
        sectorCompany.classed("g-match", false);
        searchClear.style("display", "none");
      }
    }

    function transitionView(view) {
      if (currentView === view) view = view === "overall" ? "sector" : "overall";
      d3.selectAll(".g-buttons button[data-view]").classed("g-active", function(v) { return v === view; })
      switch (currentView = view) {
        case "overall": return void transitionOverall();
        case "sector": return void transitionSector();
      }
    }

    function transitionOverall() {
      gVoronoi.style("display", "none");

      var transition = d3.transition()
          .duration(750);

      transition.select("svg")
          .delay(720)
          .attr("height", 420 + margin.top + margin.bottom)
          .each("end", function() {
            gVoronoi.call(updateVoronoi,
              function(d) { return d.cx; },
              function(d) { return d.cy + y0(nameAll); },
              420);
          });

      transition.select(".g-annotations-overall")
          .each("start", function() { this.style.display = "block"; })
          .style("opacity", 1);

      transition.select(".g-sector-notes")
          .style("opacity", 0)
          .each("end", function() { this.style.display = "none"; });

      transition.selectAll(".g-y-axis-sector")
          .style("stroke-opacity", 0)
          .style("fill-opacity", 0);

      transition.selectAll(".g-y-axis-overall")
          .style("stroke-opacity", 1)
          .style("fill-opacity", 1);

      var transitionOverall = transition.select(".g-overall-all")
          .delay(x(overallRate))
          .style("stroke-opacity", 1)
          .style("fill-opacity", 1);

      transitionOverall.select("line")
          .attr("y2", +127);

      transitionOverall.select("text")
          .attr("y", -106);

      var transitionSectorOverall = transition.selectAll(".g-sector .g-overall")
          .delay(function(d) { return x(d.rate); })
          .attr("transform", function(d) { return "translate(" + x(d.rate) + "," + (y0(nameAll) - y(d.key)) + ")"; })
          .style("stroke-opacity", 0)
          .style("fill-opacity", 0);

      transitionSectorOverall.select("line")
          .attr("y1", -100)
          .attr("y2", +127);

      transitionSectorOverall.select("text")
          .attr("y", -106);

      transition.selectAll(".g-sector-company circle")
          .delay(function(d) { return d.cx; })
          .attr("cx", function(d) { return d.cx; })
          .attr("cy", function(d) { return d.cy - y(d.sector) + y0(nameAll); });
    }

    function transitionSector() {
      gVoronoi.style("display", "none");

      var transition = d3.transition()
          .duration(750);

      transition.select("svg")
          .attr("height", height + margin.top + margin.bottom)
        .transition()
          .delay(720)
          .each("end", function() {
            gVoronoi.call(updateVoronoi,
              function(d) { return d.x; },
              function(d) { return y(d.sector) + d.y; },
              height);
          });

      transition.select(".g-annotations-overall")
          .style("opacity", 0)
          .each("end", function() { this.style.display = "none"; });

      transition.select(".g-sector-notes")
          .delay(250)
          .each("start", function() { this.style.display = "block"; })
          .style("opacity", 1);

      transition.selectAll(".g-y-axis-sector,.g-sector-note")
          .delay(250)
          .style("stroke-opacity", 1)
          .style("fill-opacity", 1);

      transition.selectAll(".g-y-axis-overall")
          .style("stroke-opacity", 0)
          .style("fill-opacity", 0);

      var transitionOverall = transition.select(".g-overall-all")
          .delay(x(overallRate))
          .style("stroke-opacity", 0)
          .style("fill-opacity", 0);

      transitionOverall.select("line")
          .attr("y2", height - y0(nameAll));

      var transitionSectorOverall = transition.selectAll(".g-sector .g-overall")
          .delay(function(d) { return x(d.rate); })
          .attr("transform", function(d) { return "translate(" + x(d.rate) + ",0)"; })
          .style("stroke-opacity", 1)
          .style("fill-opacity", 1);

      transitionSectorOverall.select("line")
          .attr("y1", -25)
          .attr("y2", +25);

      transitionSectorOverall.select("text")
          .attr("y", -31);

      transition.selectAll(".g-sector-company circle")
          .delay(function(d) { return d.x; })
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }

    function updateVoronoi(gVoronoi, x, y, height) {
      companyClip
          .attr("cx", x)
          .attr("cy", y);

      gVoronoi
          .style("display", null)
        .selectAll("path")
          .data(d3.geom.voronoi().x(x).y(y)(companies))
          .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
          .datum(function(d) { return d.point; });
    }

    function mouseoverAnnotation(re) {
      var matches = sectorCompany.filter(function(d) { return re.test(d.name) || re.test(d.alias); }).classed("g-active", true);
      if (d3.sum(matches, function(d) { return d.length; }) === 1) mouseover(matches.datum());
      else tip.style("display", "none");
    }

    function mouseover(d) {
      sectorCompany.filter(function(c) { return c === d; }).classed("g-active", true);

      var dx, dy;
      if (currentView === "overall") dx = d.cx, dy = d.cy + y0(nameAll);
      else dx = d.x, dy = d.y + y(d.sector);
      dy -= 19, dx += 50; 

      tip.style("display", null)
          .style("top", (dy - r(d.capitalization)) + "px")
          .style("left", dx + "px");

      tip.select(".g-tip-title")
          .text(d.alias || d.name);

      tipMetric.select(".g-tip-metric-value").text(function(name) {
        switch (name) {
          case "rate": return isNaN(d.rate) ? "N.A." : formatPercent(d.rate);
          case "taxes": return formatDollars(d.taxes);
          case "earnings": return formatDollars(d.earnings);
        }
      });
    }

    function mouseout() {
      tip.style("display", "none");
      sectorCompany.filter(".g-active").classed("g-active", false);
    }
  });

  function renderChartKey(g) {
    var formatPercent = d3.format(""),
        formatNumber = d3.format("");

    // A position encoding for the key only.
    var x = d3.scale.linear()
        .domain([0, .006])
        .range([0, 240]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickSize(13)
        .tickValues(z.domain())
        .tickFormat(function(d) { return d === .5 ? formatPercent(d) : formatNumber(1 * d); });

    g.append("text")
        .attr("x", -25)
        .style("text-anchor", "end")
        .style("font", "regular 9px sans-serif")
        .text("CHART KEY  ");

    var gColor = g.append("g")
        .attr("class", "g-key-color")
        .attr("transform", "translate(140,-7)");

    gColor.selectAll("rect")
        .data(z.range().map(function(d, i) {
          return {
            x0: i ? x(z.domain()[i - 1]) : x.range()[0],
            x1: i < 4 ? x(z.domain()[i]) : x.range()[1],
            z: d
          };
        }))
      .enter().append("rect")
        .attr("height", 8)
        .attr("x", function(d) { return d.x0; })
        .attr("width", function(d) { return d.x1 - d.x0; })
        .style("fill", function(d) { return d.z; });

    gColor.call(xAxis);

    var gColorText = g.append("text")
        .attr("x", 140 - 6)
        .style("text-anchor", "end");

    gColorText.append("tspan")
        .style("font-weight", "regular")
        .text("Color: ");

    gColorText.append("tspan")
        .style("fill", "#777")
        .text(" shows funding allocation");

    var gSize = g.append("g")
        .attr("class", "g-key-size")
        .attr("transform", "translate(580,-7)");

    var gSizeInstance = gSize.selectAll("g")
        .data([1e9, 10e9, 50e9, 100e9, 250e9])
        .enter().append("g")
        .attr("class", "g-sector");

    gSizeInstance.append("circle")
        .attr("r", r);

    gSizeInstance.append("text")
        .attr("x", function(d) { return r(d) + 4; })
        .attr("dy", ".1em")
        .text(function(d) { return "$" + Math.round(d / 1e9) + ""; });

    var gSizeX = 0;

    gSizeInstance.attr("transform", function() {
      var t = "translate(" + gSizeX + ",3)";
      gSizeX += this.getBBox().width + 15;
      return t;
    });

    var gSizeText = g.append("text")
        .attr("x", 580 - 10)
        .style("text-anchor", "end");

    gSizeText.append("tspan")
        .style("font-weight", "regular")
        .text("Size: ");

    gSizeText.append("tspan")
        .style("fill", "#777")
        .text(" shows amount of funding");
  }

  function yAxisWrap(g) {
    g.selectAll(".tick text")
      .filter(function(d) { return /[ ]/.test(d) && this.getComputedTextLength() > margin.left - tickExtension - 10; })
        .attr("dy", null)
        .each(function(d) {
          d3.select(this).text(null).selectAll("tspan")
              .data(d.split(" "))
            .enter().append("tspan")
              .attr("x", this.getAttribute("x"))
              .attr("dy", function(d, i) { return (i * 1.35 - .35) + "em"; })
              .text(function(d) { return d; });
        });
  }

  function taxes(d) {
    return d.taxes;
  }

  function earnings(d) {
    return d.earnings;
  }

  function rate(taxes, earnings) {
    return earnings <= 0 ? NaN : taxes / earnings;
  }

  function type(d) {
    d.x = +d.x;
    d.y = +d.y;
    d.cx = +d.cx;
    d.cy = +d.cy;
    d.taxes *= 1e6;
    d.earnings *= 1e6;
    d.capitalization *= 1e6;
    return d;
  }

  var sectorNoteByName = {
    "Ecommerce": "Start-ups in this category offered electronic products or services to either consumers or businesses to facilitate transactions.  Examples included loyalty programs, digital marketing / advertising, and notary on demand.",
    "Mobile": "This market represented a diverse set of start-ups whose products or services were typically consumer-centric.  On-demand parking, messaging, and video conversation provide a few examples of this space.",
    "Healthcare": "Start-ups in this category provided consumers with information related about the healthcare community or healthcare providers with tools to manage care.  A chemical compendium, physician directory, or nutritional guide were some services offered.",
    "Education": "The education market was comprised of start-ups that offered capabilities to facilitate the learning process.  Examples included memorization aids, story-telling, and tutoring. This market accounted for 4% of 2015 total funding",
    "Enterprise software": "Start-ups offered business-oriented tools whose purpose was to improve an organization's productivity, efficiency, and provide IT security.  Data analytics, management, and security represented the majority of start-ups.",
    "Games": "This market encompassed interactive entertainment offered through connectivity or hardware.  Virtual video games, betting, and fantasy sports teams are some examples of products or services offered.",
  };

  })();