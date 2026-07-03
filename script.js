(function () {
  var card = document.querySelector(".name-card");
  var emailLink = document.querySelector(".email-link");

  if (!card) {
    return;
  }

  var axisX = 0;
  var axisY = 1;
  var angle = 0;
  var velocity = 0;
  var spinFrame = null;
  var settleFrame = null;
  var lastSpinTime = 0;
  var pointerId = null;
  var totalDragX = 0;
  var totalDragY = 0;
  var lastX = 0;
  var lastY = 0;
  var lastMoveTime = 0;
  var movedDuringPress = false;
  var moveHistory = [];

  function setCardTransform() {
    card.style.setProperty("--axis-x", axisX.toFixed(4));
    card.style.setProperty("--axis-y", axisY.toFixed(4));
    card.style.setProperty("--angle", angle.toFixed(3) + "deg");
  }

  function showCardFrame() {
    card.classList.add("is-active");
  }

  function hideCardFrame() {
    card.classList.remove("is-active");
  }

  function cancelSettle() {
    if (settleFrame !== null) {
      cancelAnimationFrame(settleFrame);
      settleFrame = null;
    }
  }

  function stopSpin() {
    if (spinFrame !== null) {
      cancelAnimationFrame(spinFrame);
      spinFrame = null;
    }

    cancelSettle();
    velocity = 0;
    lastSpinTime = 0;
  }

  function cancelSpinFrame() {
    if (spinFrame !== null) {
      cancelAnimationFrame(spinFrame);
      spinFrame = null;
    }

    lastSpinTime = 0;
  }

  function settleToStandard() {
    cancelSpinFrame();
    cancelSettle();

    var startAngle = angle;
    var targetAngle = Math.round(angle / 360) * 360;
    var duration = 520;
    var startTime = 0;

    function settle(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }

      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      angle = startAngle + (targetAngle - startAngle) * eased;
      setCardTransform();

      if (progress < 1) {
        settleFrame = requestAnimationFrame(settle);
      } else {
        settleFrame = null;
        angle = 0;
        axisX = 0;
        axisY = 1;
        setCardTransform();
        hideCardFrame();
      }
    }

    settleFrame = requestAnimationFrame(settle);
  }

  function normalizeAxis(x, y) {
    var length = Math.hypot(x, y);

    if (length < 0.001) {
      return;
    }

    axisX = x / length;
    axisY = y / length;
  }

  function spin(timestamp) {
    if (!lastSpinTime) {
      lastSpinTime = timestamp;
    }

    var elapsed = timestamp - lastSpinTime;
    lastSpinTime = timestamp;
    angle += velocity * elapsed;

    var friction = Math.exp(-elapsed / 1450);
    velocity *= friction;
    setCardTransform();

    if (Math.abs(velocity) > 0.0018) {
      spinFrame = requestAnimationFrame(spin);
    } else {
      velocity = 0;
      settleToStandard();
    }
  }

  function startSpin() {
    cancelSpinFrame();

    if (Math.abs(velocity) > 0.002) {
      spinFrame = requestAnimationFrame(spin);
    } else {
      settleToStandard();
    }
  }

  card.addEventListener("pointerdown", function (event) {
    stopSpin();
    showCardFrame();

    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveTime = performance.now();
    totalDragX = 0;
    totalDragY = 0;
    movedDuringPress = false;
    moveHistory = [{
      x: lastX,
      y: lastY,
      time: lastMoveTime
    }];
    card.setPointerCapture(pointerId);
  });

  card.addEventListener("pointermove", function (event) {
    if (event.pointerId !== pointerId) {
      return;
    }

    var now = performance.now();
    var dx = event.clientX - lastX;
    var dy = event.clientY - lastY;
    var distance = Math.hypot(dx, dy);
    var elapsed = Math.max(now - lastMoveTime, 16);

    if (distance < 0.5) {
      return;
    }

    movedDuringPress = true;
    totalDragX += dx;
    totalDragY += dy;
    normalizeAxis(-totalDragY, totalDragX);

    var deltaAngle = distance * 0.18;
    angle += deltaAngle;
    velocity = Math.min(deltaAngle / elapsed, 0.13);
    setCardTransform();

    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveTime = now;
    moveHistory.push({
      x: lastX,
      y: lastY,
      time: lastMoveTime
    });

    while (moveHistory.length > 2 && now - moveHistory[0].time > 140) {
      moveHistory.shift();
    }
  });

  card.addEventListener("pointerup", function (event) {
    if (event.pointerId !== pointerId) {
      return;
    }

    pointerId = null;
    card.releasePointerCapture(event.pointerId);

    if (moveHistory.length >= 2) {
      var first = moveHistory[0];
      var last = moveHistory[moveHistory.length - 1];
      var releaseDx = last.x - first.x;
      var releaseDy = last.y - first.y;
      var releaseDistance = Math.hypot(releaseDx, releaseDy);
      var releaseElapsed = Math.max(last.time - first.time, 16);

      if (releaseDistance > 1) {
        normalizeAxis(-releaseDy, releaseDx);
        velocity = Math.min((releaseDistance * 0.28) / releaseElapsed, 0.42);
      }
    }

    startSpin();
  });

  card.addEventListener("pointercancel", function (event) {
    if (event.pointerId !== pointerId) {
      return;
    }

    pointerId = null;
    stopSpin();
    settleToStandard();
  });

  if (emailLink) {
    emailLink.addEventListener("click", function (event) {
      if (movedDuringPress) {
        event.preventDefault();
      }
    });
  }
}());
