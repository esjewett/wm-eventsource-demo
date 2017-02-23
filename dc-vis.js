'use strict';

// Create the crossfilter for the relevant dimensions and groups.
let events = crossfilter_facade([], dc.redrawAll),
    all = events.groupAll()

let reducer = reductio_facade()
  .count(true)
// reducer.value('size').sum('size')

let width = document.getElementById('container').clientWidth
let smallwidth = width > 500 ? width / 3 : width
let charts = []
let clearAll = () => {
  charts.forEach((c) => {
    c.filterAll()
  })
}

reductio_facade()
  .groupAll(function() { return [""]; })
  .count(true)(all);

var rehydrateFilter = function(f) {
  if(Array.isArray(f)) {
    return dc.filters.RangedFilter(f[0],f[1]);
  } else {
    return f;
  }
};

var filterHandler = function (dimension, filters) {
  if (filters.length === 0) {
    dimension.filter(null);
  } else if (filters.length === 1 && !Array.isArray(filters[0])) {
    dimension.filterExact(filters[0]);
  } else if(filters.length === 1 && Array.isArray(filters[0]) &&
    filters[0].isFiltered &&
    typeof filters[0][0] === typeof filters[0][1]) {

    dimension.filterRange([filters[0][0], filters[0][1]]);
  } else {
    dimension.filterFunction(function (d) {
      for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        if (filter.isFiltered && filter.isFiltered(d)) {
          return true;
        } else if (filter <= d && filter >= d) {
          return true;
        }
      }
      return false;
    }, 'var filters = ' + JSON.stringify(filters) + '.map(' + rehydrateFilter.toString() + ');');
  }
  return filters;
};

let clientRecords = dc.dataCount("#client-records")
  .dimension({ size: function() { return events.size(); } })
  .group({ value: function() { return all.value()[0] ? all.value()[0].value.count : 0; }})
  .html({
    some: '%filter-count of %total-count total records displayed',
    all: '%filter-count of %total-count total records displayed'
  });

let typeDim = events.dimension(function(d) { return d.type ? d.type : ""; });
let typeGroup = typeDim.group();
reducer(typeGroup)
let typeChart = dc.rowChart('#type')
  .height(180)
  .width(smallwidth)
  .margins({top: 5, left: 10, right: 10, bottom: 20})
  .group(typeGroup)
  // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
  .valueAccessor(function(d) { return d.value.count; })
  .labelOffsetY(function() { return 7; })
  .labelOffsetX(function() { return 5; })
  .dimension(typeDim)
  .ordinalColors(['#3182bd'])
  .elasticX(true)
typeChart.filterHandler(filterHandler)
charts.push(typeChart)

let minorDim = events.dimension(function(d) { return d.minor ? d.minor : ""; });
let minorGroup = minorDim.group();
reducer(minorGroup)
let minorChart = dc.rowChart('#minor')
  .height(180)
  .width(smallwidth)
  .margins({top: 5, left: 10, right: 10, bottom: 20})
  .group(minorGroup)
  // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
  .valueAccessor(function(d) { return d.value.count; })
  .labelOffsetY(function() { return 7; })
  .labelOffsetX(function() { return 5; })
  .label((d) => { return d.key ? "Minor" : "Major" })
  .dimension(minorDim)
  .ordinalColors(['#3182bd'])
  .elasticX(true)
minorChart.filterHandler(filterHandler)
charts.push(minorChart)

let botDim = events.dimension(function(d) { return d.bot ? d.bot : ""; });
let botGroup = botDim.group();
reducer(botGroup)
let botChart = dc.rowChart('#bot')
  .height(180)
  .width(smallwidth)
  .margins({top: 5, left: 10, right: 10, bottom: 20})
  .group(botGroup)
  // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
  .valueAccessor(function(d) { return d.value.count; })
  .labelOffsetY(function() { return 7; })
  .labelOffsetX(function() { return 5; })
  .label((d) => { return d.key ? "Bot" : "Not a bot" })
  .dimension(botDim)
  .ordinalColors(['#3182bd'])
  .elasticX(true);
botChart.filterHandler(filterHandler)
charts.push(botChart)

let wikiDim = events.dimension(function(d) { return d.wiki ? d.wiki : ""; });
let wikiGroup = wikiDim.group();
reducer(wikiGroup)
let wikiChart = dc.pieChart('#wiki')
  .height(180)
  .group(wikiGroup)
  // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
  .valueAccessor(function(d) { return d.value.count; })
  .dimension(wikiDim)
  .ordinalColors(['#3182bd'])
  .ordering((d) => {
    return -d.value.count
  })
  .innerRadius(30)
  .slicesCap(9)
  .colors(d3.scale.ordinal().range(colorbrewer.Blues[9]))
wikiChart.filterHandler(filterHandler)
charts.push(wikiChart)

let timeDim = events.dimension(function(d) { return d.timestamp ? new Date(d.timestamp*1000) : new Date(Date.now()); });
let timeGroup = timeDim.group();
let startDate = new Date(Date.now()+5000)
reducer(timeGroup)
let timeChart = dc.lineChart('#timestamp')
        .renderArea(true)
        .width(width)
        .height(200)
        .transitionDuration(250)
        .dimension(timeDim)
        .round(d3.time.second.round)
        .xUnits(d3.time.seconds)
        .elasticY(true)
        .x(d3.time.scale().domain([startDate, new Date()]))
        .renderHorizontalGridLines(true)
        .legend(dc.legend().x(width - 100).y(20).itemHeight(13).gap(5))
        .group(timeGroup, 'Edits per second')
        .valueAccessor(function (d) {
            return d.value.count;
        })
timeChart.filterHandler(filterHandler)
charts.push(timeChart)

let sizeDim = events.dimension(function(d) { return d.size ? d.size : 0; });
// aggregate all 10000+ edits at 10000, strip out 0s (which are actually nulls)  to -1000
let sizeGroup = sizeDim.group(function(d) { return d > 10000 ? 10000 : d===0 ? -1000 : Math.floor(d/1000)*1000 });
reducer(sizeGroup)
let sizeChart = dc.barChart('#size')
        .width(smallwidth)
        .height(200)
        .dimension(sizeDim)
        // .centerBar(true)
        .x(d3.scale.linear().domain([0, 11000]))
        // .y(d3.scale.log())
        .elasticY(true)
        .xUnits(function(d) { return 11; })
        .renderHorizontalGridLines(true)
        .group(sizeGroup)
        .valueAccessor(function (d) {
          return d.value.count
        })
sizeChart.yAxis().tickFormat(d3.format("s"))
sizeChart.xAxis().tickFormat(d3.format("s"))
sizeChart.filterHandler(function (dimension, filters) {
  let newFilters = []
  if(filters[0] && filters[0][1] === 11000) {
    newFilters[0] = [filters[0][0], 999999999] // Infinity doesn't serialize
  } else {
    newFilters = filters
  }
  return filterHandler(dimension, newFilters)
})
charts.push(sizeChart)


let arrivalDim = events.dimension(function(d) { return d.arrivalDelay ? d.arrivalDelay : 0; });
// aggregate all 10+ delays at 10, strip out 0s (which are actually nulls)  to -1
let arrivalGroup = arrivalDim.group(function(d) { return d > 10 ? 10 : d===0 ? -1 : Math.floor(d) });
reducer(arrivalGroup)
let arrivalChart = dc.barChart('#arrival')
        .width(smallwidth)
        .height(200)
        .dimension(arrivalDim)
        // .centerBar(true)
        .x(d3.scale.linear().domain([0, 11]))
        // .y(d3.scale.log())
        .elasticY(true)
        .xUnits(function(d) { return 11; })
        .renderHorizontalGridLines(true)
        .group(arrivalGroup)
        .valueAccessor(function (d) {
          return d.value.count
        })
arrivalChart.yAxis().tickFormat(d3.format("s"))
arrivalChart.filterHandler(function (dimension, filters) {
  let newFilters = []
  if(filters[0] && filters[0][1] === 11) {
    newFilters[0] = [filters[0][0], 999999999] // Infinity doesn't serialize
  } else {
    newFilters = filters
  }
  return filterHandler(dimension, newFilters)
})
charts.push(arrivalChart)


// userDim = events.dimension(function(d) { return d.user ? d.user : ""; });
// userGroup = userDim.group();
// reductio_facade()
//   .count(true)(userGroup)
// userChart = dc.rowChart('#user')
//   .height(180)
//   .width(300)
//   .margins({top: 5, left: 10, right: 10, bottom: 20})
//   .group(userGroup)
//   // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
//   .valueAccessor(function(d) { return d.value.count; })
//   .labelOffsetY(function() { return 7; })
//   .labelOffsetX(function() { return 5; })
//   .dimension(userDim)
//   .ordinalColors(['#3182bd'])
//   .elasticX(true);
// userChart.filterHandler(filterHandler)

dc.renderAll()

setInterval(() => {
  timeChart.x(d3.time.scale().domain([startDate, new Date()]))
  dc.redrawAll()
}, 1000)