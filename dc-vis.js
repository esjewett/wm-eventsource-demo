'use strict';

// Create the crossfilter for the relevant dimensions and groups.
let events = crossfilter_facade([], dc.redrawAll),
    all = events.groupAll()

let reducer = reductio_facade()
  .count(true)
reducer.value('size').sum('size')

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
  .width(300)
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

let minorDim = events.dimension(function(d) { return d.minor ? d.minor : ""; });
let minorGroup = minorDim.group();
reducer(minorGroup)
let minorChart = dc.rowChart('#minor')
  .height(180)
  .width(300)
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

let botDim = events.dimension(function(d) { return d.bot ? d.bot : ""; });
let botGroup = botDim.group();
reducer(botGroup)
let botChart = dc.rowChart('#bot')
  .height(180)
  .width(300)
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

let wikiDim = events.dimension(function(d) { return d.wiki ? d.wiki : ""; });
let wikiGroup = wikiDim.group();
reducer(wikiGroup)
let wikiChart = dc.pieChart('#wiki')
  .height(180)
  .width(300)
  .group(wikiGroup)
  // .data(function(group) { return group.all().filter(function(d) { return d.key !== ""; }); })
  .valueAccessor(function(d) { return d.value.count; })
  .dimension(wikiDim)
  .ordinalColors(['#3182bd'])
  .ordering((d) => {
    return -d.value.count
  })
  .slicesCap(10)
wikiChart.filterHandler(filterHandler)

let timeDim = events.dimension(function(d) { return d.timestamp ? new Date(d.timestamp*1000) : new Date(Date.now()); });
let timeGroup = timeDim.group();
let startDate = new Date(Date.now()+5000)
reducer(timeGroup)
let timeChart = dc.lineChart('#timestamp')
        .renderArea(true)
        .width(990)
        .height(200)
        .transitionDuration(250)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .dimension(timeDim)
        .round(d3.time.second.round)
        .xUnits(d3.time.seconds)
        .elasticY(true)
        .x(d3.time.scale().domain([startDate, new Date()]))
        .renderHorizontalGridLines(true)
        .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
        .group(timeGroup, 'Edits by second')
        .valueAccessor(function (d) {
            return d.value.count;
        })
timeChart.filterHandler(filterHandler)

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