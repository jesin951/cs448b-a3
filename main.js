var svg = d3.select("svg"),
    margin = {top: 20, right: 80, bottom: 30, left: 50},
    width = svg.attr("width") - margin.left - margin.right,
    height = svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var parseTime = d3.timeParse("%m/%d/%y");

var x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    z = d3.scaleOrdinal(d3.schemeCategory20);

var line = d3.line()
    //.curve(d3.curveBasis)
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.price); });

var drag = d3.drag()
  .on("start", started);

var dragBox = d3.drag()
  // .origin(function(d) { return {x: d.x, y: d.y}; })
  .on("drag", draggedBox);

var stocks;
var filterBoxes = [];
var maxPriceToShow = 120.0;


d3.csv("stocks-06-08-filtered.csv", type, function(error, data) {
  if (error) throw error;

  // Set up data as list of stocks: [{ id, values: [{ date, price }] }]
  stocks = data.columns.slice(1).map(function(id) {
    return {
      id: id,
      values: data.map(function(d) {
        return {date: d.date, price: d[id]};
      })
    };
  })

  // This filtered the data to be nicer to look at. No semantics.
  // We just want to avoid students having to deal with real-world dirty data
  // until the next assignment. D3 will be confusing enough initially.
  
  // .filter(function(stock) {
  //   return stock.values.every(function(value) {
  //     return value.price < maxPriceToShow;
  //   });
  // }).filter(function(stock) {
  //   return stock.values.every(function(value) {
  //     return value.price > 0;
  //   });
  // });


  // This allows to export filtered data:
  // var scsv = "date,";
  // for (var s = 0; s < stocks.length; ++s) {
  //   scsv += stocks[s].id + ","
  // }
  // scsv += "\n";
  // for (var r = 0; r < stocks[1].values.length; ++r) {
  //   var date = stocks[1].values[r].date;
  //   var d = date.toISOString().slice(0, 10).split('-');
  //   scsv += d[1] + "/" + d[2] + "/" + d[0].slice(2) + ",";
  //   for (var s = 0; s < stocks.length; ++s) {
  //     scsv += stocks[s].values[r].price + ","
  //   }
  //   scsv += "\n"
  // }
  // var blob = new Blob([scsv], { type: 'text/csv;charset=utf-8;' });
  //
  // var link = document.createElement("a");
  // if (link.download !== undefined) { // feature detection
  //     // Browsers that support HTML5 download attribute
  //     var url = URL.createObjectURL(blob);
  //     link.setAttribute("href", url);
  //     link.setAttribute("download", "data.csv");
  //     link.style.visibility = 'hidden';
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  // }


  // Set up scales
  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain([0,maxPriceToShow]);

  z.domain(stocks.map(function(c) { return c.id; }));

  // Stock g object
  var stock = g.selectAll(".stock")
    .data(stocks)
    .enter().append("g")
      .attr("class", "stock");

  // Line Graph
  stock.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      // .style("stroke", function(d) { return z(d.id); });

  // Ticker symbols
  stock.append("text")
    .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
    .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.price) + ")"; })
    .attr("x", 3)
    .attr("dy", "0.35em")
    .style("font", "10px sans-serif")
    .text(function(d) { return d.id; });

  // X-Axis
  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

  // Y-Axis
  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y))
    .append("text")
      .classed("axis-label", true)
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .text("Closing Price, $");

});

function draw(filters) {

  // Boxes

  var boxes = g.selectAll(".filter")
    .data(filterBoxes)

  boxes.enter()
    .append("rect")
      .classed("filter", true)
      .attr('id', function(d) { return d.id })
      .on("click", remove)
      .call(dragBox)
  .merge(boxes)
    .attr("width",  function(d) { return d.width })
    .attr("height", function(d) { return d.height })
    .attr("x", function(d) { return d.x })
    .attr("y", function(d) { return d.y });

  boxes.exit().remove();

  // Stocks

  var stock = g.selectAll(".stock")
    .data(stocks)

  stock.classed("line-filtered", function(stock) {
    var visible = true;
    filterBoxes.forEach( function(box) {
      stock.values.forEach( function(value) {
        if (value.date > box.startDate && value.date < box.endDate) {
          visible = visible && (value.price < box.maxPrice && value.price > box.minPrice)
        }
        if(!visible) return !visible;
      })
    });
    return !visible;
  })
}

// Dragging behavior

d3.selectAll("svg").call(drag);
d3.selectAll("svg").on("click", addDefaultBox);

function started() {

  if (d3.event.defaultPrevented) return; // clicked

  d3.event.on("drag", dragged).on("end", ended);

  var box;

  function dragged(d) {
    if (!box) {
      // add new filter box with initial values
      box = {
        id: filterBoxes.length,
        x1: d3.event.x - margin.left,
        y1: d3.event.y - margin.top
      }
      filterBoxes.push(box);
    }

    box.x2 = d3.event.x - margin.left;
    box.y2 = d3.event.y - margin.top;

    // compute meaningful representation of values
    box.width     = Math.abs(box.x1 - box.x2);
    box.height    = Math.abs(box.y1 - box.y2);
    box.x         = Math.min(box.x1, box.x2);
    box.y         = Math.min(box.y1, box.y2);
    box.startDate = x.invert(box.x);
    box.endDate   = x.invert(box.x + box.width);
    box.minPrice  = y.invert(box.y + box.height);
    box.maxPrice  = y.invert(box.y);

    draw(filterBoxes)
  }

  function ended() {
    //circle.classed("dragging", false);
    // var filterBox = filterBoxes[filterBoxes.length - 1];
    // filterBox.width = d3.event.x - filterBox.x;
    // filterBox.height = d3.event.y - filterBox.y;
    // console.log(d3.event);
    // console.log(filterBoxes);
    draw(filterBoxes)
  }
}

function remove() {
  var boxId = d3.event.target.id;
  filterBoxes.splice(boxId, 1);
  draw(filterBoxes);
  d3.event.preventDefault();
  d3.event.stopPropagation();
}

function draggedBox() {

  var box = d3.event.subject;
  box.x = box.x + d3.event.dx;
  box.y = box.y + d3.event.dy;

  // compute meaningful representation of values
  box.startDate = x.invert(box.x);
  box.endDate   = x.invert(box.x + box.width);
  box.minPrice  = y.invert(box.y + box.height);
  box.maxPrice  = y.invert(box.y);

  draw(filterBoxes)
}

function addDefaultBox() {

  var box = {
    id: filterBoxes.length,
    x1: d3.event.x - margin.left - 75.0,
    y1: d3.event.y - margin.top - 75.0,
    x2: d3.event.x - margin.left + 75.0,
    y2: d3.event.y - margin.top + 75.0
  }

  // compute meaningful representation of values
  box.width     = Math.abs(box.x1 - box.x2);
  box.height    = Math.abs(box.y1 - box.y2);
  box.x         = Math.min(box.x1, box.x2);
  box.y         = Math.min(box.y1, box.y2);
  box.startDate = x.invert(box.x);
  box.endDate   = x.invert(box.x + box.width);
  box.minPrice  = y.invert(box.y + box.height);
  box.maxPrice  = y.invert(box.y);
  console.log(box);

  filterBoxes.push(box);
  draw(filterBoxes);
  d3.event.preventDefault();
  d3.event.stopPropagation();
}

function type(d, _, columns) {
  d.date = parseTime(d.date);
  for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
  return d;
}
