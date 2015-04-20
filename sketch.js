/* globals require */
require(['node_modules/bvg/bvg'], function(BVG) {

  // Paths
  var path_gameSources = 'generated/game-sources.json';
  var path_gameRelations = 'generated/roguelike-relations.json';
  var path_gameYears = 'generated/games-years.json';
  var path_otherRelations = 'generated/other-relations.json';

  // Containers
  var data_gameSources;
  var data_gameRelations;
  var data_gameYears;
  var data_otherRelations;

  // Layout
  var heinlein_height = 80;
  var force_height = 100;

  // Dynamic Functions
  var getXCoordByYear;
  var getHueByYear;
  var getYearWidth;

  // Charts
  var BVG_Heinlein = BVG.create('#heinlein', 100, heinlein_height);
  var BVG_Force = BVG.create('#force', 100, force_height);

  // Controls
  var UI_GameSelection = document.querySelector('#game-selection');

  // Async request for the list of game and years
  getJSON(path_gameYears).then(function (json) {
    data_gameYears = json;
    var ys = [];
    Object.keys(data_gameYears).forEach(function (game) {
      ys.push(data_gameYears[game]);
    });

    var min_year = Math.min.apply(null, ys);
    var max_year = Math.max.apply(null, ys);
    getYearWidth = function () {
      return 90 / (max_year - min_year + 1);
    };
    getXCoordByYear = function (year) {
      return (year - min_year) / (max_year - min_year + 1) * 90 + 5;
    };
    getHueByYear = function (year) {
      return (year - min_year) / (max_year - min_year) * 360;
    };

    for (var year = min_year; year <= max_year; year++) {
      var x = getXCoordByYear(year);
      BVG_Heinlein.text(year, x, heinlein_height / 2 + 1.75)
                  .addClass('year')
                  .fill(BVG.hsla(getHueByYear(year), 40, 60));
    }
    return getJSON(path_gameSources);

  }).then(function (json) {
    data_gameSources = json;

    // Scramble force layout coordinates and populate titles
    Object.keys(data_gameSources).forEach(function (title) {
      var option = document.createElement('option');
      option.value = title;
      option.innerHTML = title;
      UI_GameSelection.appendChild(option);
      data_gameSources[title].x = Math.random() * 100;
      data_gameSources[title].y = Math.random() * 100;
    });

    return getJSON(path_gameRelations);

  // Roguelike Relations
  }).then(function (json) {
    data_gameRelations = json;

    Object.keys(data_gameRelations).forEach(function (title) {
      var cache = {};

      BVG_Heinlein.text('Roguelike games', 5, 10)
                  .addClass('label')
                  .fill(BVG.hsla(20, 30, 70));

      data_gameRelations[title].forEach(function (other) {
        if (cache.hasOwnProperty(other) || other === title) return;
        else cache[other] = true;

        // Draw Roguelike relation Heinlein arcs
        var title_x = getXCoordByYear(data_gameSources[title].Year);
        var other_x = getXCoordByYear(data_gameSources[other].Year);
        var x = (title_x + other_x) / 2 + getYearWidth() * 0.9 / 2;
        var y = heinlein_height / 2 + 0.5;
        var r = Math.abs(title_x - other_x) / 2;
        BVG_Heinlein.arc(x, y, r, r, Math.PI, Math.PI*2)
                    .stroke(BVG.hsla(getHueByYear(data_gameSources[title].Year), 40, 70))
                    .strokeWidth(0.1)
                    .noFill();

        // Draw force layout links
        var line = new BVG('line', {
          begin: data_gameSources[title],
          end: data_gameSources[other]
        }, function (tag, data) {
          tag.setAttribute('x1', data.begin.x);
          tag.setAttribute('y1', data.begin.y);
          tag.setAttribute('x2', data.end.x);
          tag.setAttribute('y2', data.end.y);
        });
        line.strokeWidth(0.1);
        BVG_Force.append(line);
      });
    });

    //Draw Force directed layout nodes
    Object.keys(data_gameSources).forEach(function (title) {
      var circle = new BVG('circle', {
          points: data_gameSources[title],
          r: 0.5
        }, function (tag, data) {
          tag.setAttribute('cx', data.points.x);
          tag.setAttribute('cy', data.points.y);
          tag.setAttribute('r', data.r);
        });
        circle.strokeWidth(0.1)
              .stroke(240, 128, 64)
              .fill(220, 64, 32);
        BVG_Force.append(circle);
    });

    function _updateForceLayout () {
      if(!updateForceLayout(data_gameSources, data_gameRelations)) {
        window.requestAnimationFrame(_updateForceLayout);
      } else {
        console.log('Force Layout completed');
      }
    }
    window.requestAnimationFrame(_updateForceLayout);

    return getJSON(path_otherRelations);

  }).then (function (json) {
    data_otherRelations = json;

    Object.keys(data_otherRelations).forEach(function (title) {
      var cache = {};

      BVG_Heinlein.text('Other games', 5, 75)
              .addClass('label')
              .fill(BVG.hsla(20, 30, 80));

      // Heinlein relations for out of genre
      data_otherRelations[title].forEach(function (other) {
        if (cache.hasOwnProperty(other)) return;
        else cache[other] = true;

        var title_x = getXCoordByYear(data_gameSources[title].Year);
        var other_x = getXCoordByYear(data_gameYears[other]);
        var x = (title_x + other_x) / 2 + getYearWidth() * 0.9 / 2;
        var y = heinlein_height / 2 + 2.5;
        var r = Math.abs(title_x - other_x) / 2;
        BVG_Heinlein.arc(x, y, r, r, 0, Math.PI)
                .stroke(BVG.hsla(getHueByYear(data_gameSources[title].Year), 40, 70, 0.2))
                .strokeWidth(0.1)
                .noFill();
      });
    });

    ///////
    // UI Handling
    // Attach update function to game selection
    UI_GameSelection.addEventListener('change', function gameSelectionFunc (event) {
      var game = data_gameSources[event.target.value];

      // Clean up existing selection
      BVG_Heinlein.find('.heinlein-selection').forEach(function (bvg) {
        bvg.remove();
      });

      var x = getXCoordByYear(game.Year) + getYearWidth() / 2 + 0.3;
      var y = heinlein_height / 2;
      var colour = BVG.hsla(getHueByYear(game.Year), 40, 60, 1);
      var rectData = {
        x: getXCoordByYear(game.Year),
        y: y,
        width: getYearWidth(),
        height: 0
      };
      var rect = BVG_Heinlein.rect(rectData).fill(colour).noStroke().addClass('heinlein-selection');
      var text = BVG_Heinlein.text(event.target.value, x, y)
                  .attr('transform', 'rotate(-90 ' + x + ' ' + y + ')')
                  .addClass('heinlein-selection');
      var textWidth = text.tag().getBBox().width;
      rectData.y = y - textWidth - 1;
      rectData.height = textWidth + 2;
    });

  // Error handling
  }).catch(function (e) {
    throw e;
  });

  function getURL (url) {
    return new Promise(function (resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', url);
      req.onload = function () {
        if (req.status == 200) {
          resolve(req.response);
        } else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = function() {
        reject(new Error('Network Error'));
      };
      req.send();
    });
  }

  function getJSON (url) {
    return getURL(url).then(JSON.parse).catch(function (err) {
      console.log('getJSON failed to load', url);
      throw err;
    });
  }

  function updateForceLayout (points, relations) {
    var threshold = 10;

    // Converging variable
    var limit = 1;
    var converge = limit;

    // Reset forces
    var forces = {};
    Object.keys(points).forEach(function (point) {
      forces[point] = {
        Fx: 0,
        Fy: 0
      };
    });

    // Calculate attractive forces and repulsive forces
    Object.keys(points).forEach(function (point) {
      Object.keys(points).forEach(function (other) {
        if (point === other) return;
        var xDistance = points[other].x - points[point].x;
        var yDistance = points[other].y - points[point].y;
        var angle = Math.atan2(yDistance, xDistance);
        var distance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

        var F;
        if (relations[point].indexOf(other) > -1 || relations[other].indexOf(point) > -1) {
          F = 4 * Math.log(distance / threshold);
        } else {
          F = Math.log(distance / (threshold * 4));
        }

        var Fx = F * Math.cos(angle);
        var Fy = F * Math.sin(angle);
        forces[point].Fx += Fx;
        forces[point].Fy += Fy;
        forces[other].Fx += -Fx;
        forces[other].Fy += -Fy;

        converge = Math.max(converge, Math.abs(Fx), Math.abs(Fy));
      });
    });

    // Move a tiny step
    Object.keys(points).forEach(function (point) {
      points[point].x += forces[point].Fx * 0.1;
      points[point].y += forces[point].Fy * 0.1;
    });

    // Establish convergence
    return converge <= limit;
  }

});