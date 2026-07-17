package com.oleksiiburdeniuk.taxometer.externaldisplay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

private data class TripDisplaySnapshot(val json: JSONObject) {
  val tripId: String = json.optString("tripId")
  val status: String = json.optString("status", "active")
  val amountText: String = json.optString("amountText")
  val distanceText: String = json.optString("distanceText")
  val durationText: String = json.optString("durationText")
  val tariffName: String = json.optString("tariffName")
  val startedAtMs: Long = json.optLong("startedAtMs")
  val pausedAtMs: Long? = json.optLong("pausedAtMs").takeIf { json.has("pausedAtMs") && it > 0 }
  val openUrl: String = json.optString("openUrl", "taxometer://active-trip")
  val controlUrl: String = json.optString("controlUrl", "taxometer://active-trip")
  private val labels = json.optJSONObject("labels") ?: JSONObject()

  fun label(key: String, fallback: String): String = labels.optString(key, fallback)

  fun currentDuration(now: Long = System.currentTimeMillis()): String {
    if (startedAtMs <= 0) return durationText
    val end = if (status == "paused") pausedAtMs ?: now else now
    val seconds = ((end - startedAtMs).coerceAtLeast(0) / 1000).toInt()
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val rest = seconds % 60
    return "%02d:%02d:%02d".format(hours, minutes, rest)
  }
}

class TaxometerTripService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var windowManager: WindowManager
  private var snapshot: TripDisplaySnapshot? = null
  private var overlayRoot: LinearLayout? = null
  private var compactRow: LinearLayout? = null
  private var expandedPanel: LinearLayout? = null
  private var compactAmount: TextView? = null
  private var expandedAmount: TextView? = null
  private var timeValue: TextView? = null
  private var distanceValue: TextView? = null
  private var tariffValue: TextView? = null
  private var statusValue: TextView? = null
  private var pauseButton: TextView? = null
  private var layoutParams: WindowManager.LayoutParams? = null
  private var compact = true

  private val timerTick = object : Runnable {
    override fun run() {
      snapshot?.let { timeValue?.text = it.currentDuration() }
      handler.postDelayed(this, 1000)
    }
  }

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    compact = preferences(this).getBoolean(KEY_COMPACT, true)
    handler.post(timerTick)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        removeOverlay()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
        else @Suppress("DEPRECATION") stopForeground(true)
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_REFRESH_OVERLAY -> refreshOverlay()
      ACTION_START, ACTION_UPDATE, null -> {
        val json = intent?.getStringExtra(EXTRA_SNAPSHOT)
          ?: preferences(this).getString(KEY_SNAPSHOT, null)
        if (!json.isNullOrBlank()) {
          runCatching { TripDisplaySnapshot(JSONObject(json)) }.getOrNull()?.let {
            snapshot = it
            preferences(this).edit().putString(KEY_SNAPSHOT, json).apply()
            promoteToForeground(it)
            renderOverlay(it)
          }
        }
      }
    }
    return START_REDELIVER_INTENT
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    handler.removeCallbacks(timerTick)
    removeOverlay()
    super.onDestroy()
  }

  private fun promoteToForeground(item: TripDisplaySnapshot) {
    createNotificationChannel()
    val notification = buildNotification(item)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun buildNotification(item: TripDisplaySnapshot): Notification {
    val openIntent = activityPendingIntent(item.openUrl, 40)
    val controlIntent = activityPendingIntent(item.controlUrl, 41)
    val paused = item.status == "paused"
    val state = if (paused) item.label("paused", "Ride paused") else item.label("active", "Ride in progress")
    val controlLabel = if (paused) item.label("resume", "Resume") else item.label("pause", "Pause")
    val smallIcon = resources.getIdentifier("taxometer_notification", "drawable", packageName)
      .takeIf { it != 0 } ?: applicationInfo.icon
    val details = "${item.currentDuration()}  ·  ${item.distanceText}  ·  ${item.tariffName}"

    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(smallIcon)
      .setContentTitle(item.amountText)
      .setContentText(details)
      .setSubText(state)
      .setStyle(Notification.BigTextStyle().bigText(details))
      .setContentIntent(openIntent)
      .addAction(0, controlLabel, controlIntent)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setColor(Color.rgb(255, 204, 0))
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setShowWhen(item.status == "active")
      .setWhen(item.startedAtMs)
      .setUsesChronometer(item.status == "active")
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(NotificationChannel(
        CHANNEL_ID,
        "Active taxi ride",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Current taximeter fare and ride controls"
        setShowBadge(false)
      })
    }
  }

  private fun activityPendingIntent(url: String, requestCode: Int): PendingIntent {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(Intent.ACTION_VIEW)
    launch.action = Intent.ACTION_VIEW
    launch.data = Uri.parse(url)
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(
      this,
      requestCode,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun refreshOverlay() {
    if (!shouldShowOverlay()) {
      removeOverlay()
      return
    }
    snapshot?.let { renderOverlay(it) }
  }

  private fun shouldShowOverlay(): Boolean =
    isOverlayEnabled(this) && (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this))

  private fun renderOverlay(item: TripDisplaySnapshot) {
    if (!shouldShowOverlay()) {
      removeOverlay()
      return
    }
    if (overlayRoot == null) createOverlay(item)
    compactAmount?.text = item.amountText
    expandedAmount?.text = item.amountText
    timeValue?.text = item.currentDuration()
    distanceValue?.text = item.distanceText
    tariffValue?.text = item.tariffName
    statusValue?.text = if (item.status == "paused") item.label("paused", "Ride paused") else item.label("active", "Ride in progress")
    pauseButton?.apply {
      text = if (item.status == "paused") "▶  ${item.label("resume", "Resume")}" else "Ⅱ  ${item.label("pause", "Pause")}" 
      setOnClickListener { openApp(item.controlUrl) }
    }
    applyCompactState()
  }

  @Suppress("DEPRECATION")
  private fun createOverlay(item: TripDisplaySnapshot) {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      elevation = dp(12).toFloat()
      background = roundedBackground("#17191C", 18)
      setPadding(dp(10), dp(8), dp(10), dp(8))
    }
    val compactHeader = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    compactHeader.addView(text("🚕", 20f, Color.WHITE, bold = false))
    compactAmount = text(item.amountText, 17f, Color.rgb(255, 204, 0), bold = true).also {
      compactHeader.addView(it, LinearLayout.LayoutParams(0, dp(42), 1f).apply { marginStart = dp(8) })
    }
    compactHeader.addView(text("↗", 20f, Color.WHITE, bold = true).apply {
      gravity = Gravity.CENTER
      setPadding(dp(10), 0, dp(4), 0)
      setOnClickListener { compact = false; saveCompact(); applyCompactState() }
    }, LinearLayout.LayoutParams(dp(42), dp(42)))

    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(4), dp(2), dp(4), dp(4))
    }
    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    header.addView(text("🚕", 20f, Color.WHITE, bold = false))
    statusValue = text("", 12f, Color.LTGRAY, bold = true).also {
      header.addView(it, LinearLayout.LayoutParams(0, dp(42), 1f).apply { marginStart = dp(8) })
    }
    header.addView(text("—", 22f, Color.WHITE, bold = true).apply {
      gravity = Gravity.CENTER
      setOnClickListener { compact = true; saveCompact(); applyCompactState() }
    }, LinearLayout.LayoutParams(dp(42), dp(42)))
    panel.addView(header)

    expandedAmount = text(item.amountText, 27f, Color.rgb(255, 204, 0), bold = true).also {
      panel.addView(it, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(46)))
    }
    val metrics = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    val timeMetric = metric(item.label("time", "Time"))
    timeValue = timeMetric.getChildAt(1) as TextView
    val distanceMetric = metric(item.label("distance", "Distance"))
    distanceValue = distanceMetric.getChildAt(1) as TextView
    metrics.removeAllViews()
    metrics.addView(timeMetric, LinearLayout.LayoutParams(0, dp(54), 1f))
    metrics.addView(distanceMetric, LinearLayout.LayoutParams(0, dp(54), 1f))
    panel.addView(metrics)
    val tariffMetric = metric(item.label("tariff", "Tariff"))
    tariffValue = tariffMetric.getChildAt(1) as TextView
    panel.addView(tariffMetric, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)))

    val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
    pauseButton = actionButton("").also { actions.addView(it, LinearLayout.LayoutParams(0, dp(46), 1f)) }
    actions.addView(actionButton(item.label("open", "Open")).apply { setOnClickListener { openApp(item.openUrl) } }, LinearLayout.LayoutParams(0, dp(46), 1f).apply { marginStart = dp(8) })
    panel.addView(actions)

    root.addView(compactHeader, LinearLayout.LayoutParams(dp(220), LinearLayout.LayoutParams.WRAP_CONTENT))
    root.addView(panel, LinearLayout.LayoutParams(dp(270), LinearLayout.LayoutParams.WRAP_CONTENT))
    compactRow = compactHeader
    expandedPanel = panel

    val prefs = preferences(this)
    val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      windowType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = prefs.getInt(KEY_X, dp(16))
      y = prefs.getInt(KEY_Y, dp(120))
    }
    layoutParams = params
    attachDrag(header)
    attachDrag(compactHeader)
    windowManager.addView(root, params)
    overlayRoot = root
  }

  private fun metric(label: String): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER_VERTICAL
    addView(text(label.uppercase(), 9f, Color.GRAY, bold = true))
    addView(text("—", 14f, Color.WHITE, bold = true))
  }

  private fun actionButton(label: String): TextView = text(label, 13f, Color.rgb(23, 25, 28), bold = true).apply {
    gravity = Gravity.CENTER
    background = roundedBackground("#FFCC00", 12)
  }

  private fun text(value: String, size: Float, color: Int, bold: Boolean): TextView = TextView(this).apply {
    text = value
    textSize = size
    setTextColor(color)
    gravity = Gravity.CENTER_VERTICAL
    includeFontPadding = false
    if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
    maxLines = 1
  }

  private fun attachDrag(view: View) {
    var downX = 0f
    var downY = 0f
    var startX = 0
    var startY = 0
    view.setOnTouchListener { _, event ->
      val params = layoutParams ?: return@setOnTouchListener false
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX; downY = event.rawY; startX = params.x; startY = params.y; true
        }
        MotionEvent.ACTION_MOVE -> {
          params.x = (startX + event.rawX - downX).toInt()
          params.y = (startY + event.rawY - downY).toInt()
          overlayRoot?.let { windowManager.updateViewLayout(it, params) }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          preferences(this).edit().putInt(KEY_X, params.x).putInt(KEY_Y, params.y).apply(); true
        }
        else -> false
      }
    }
  }

  private fun applyCompactState() {
    compactRow?.visibility = if (compact) View.VISIBLE else View.GONE
    expandedPanel?.visibility = if (compact) View.GONE else View.VISIBLE
  }

  private fun saveCompact() {
    preferences(this).edit().putBoolean(KEY_COMPACT, compact).apply()
  }

  private fun openApp(url: String) {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(Intent.ACTION_VIEW)
    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.parse(url)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    startActivity(intent)
  }

  private fun removeOverlay() {
    overlayRoot?.let { runCatching { windowManager.removeView(it) } }
    overlayRoot = null
    compactRow = null
    expandedPanel = null
  }

  private fun roundedBackground(color: String, radiusDp: Int) = GradientDrawable().apply {
    setColor(Color.parseColor(color))
    cornerRadius = dp(radiusDp).toFloat()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  companion object {
    private const val CHANNEL_ID = "taxometer-active-trip"
    private const val NOTIFICATION_ID = 725001
    private const val ACTION_START = "taxometer.external.START"
    private const val ACTION_UPDATE = "taxometer.external.UPDATE"
    private const val ACTION_STOP = "taxometer.external.STOP"
    private const val ACTION_REFRESH_OVERLAY = "taxometer.external.REFRESH_OVERLAY"
    private const val EXTRA_SNAPSHOT = "snapshot"
    private const val PREFS = "taxometer-external-display"
    private const val KEY_SNAPSHOT = "snapshot"
    private const val KEY_OVERLAY_ENABLED = "overlay-enabled"
    private const val KEY_COMPACT = "compact"
    private const val KEY_X = "overlay-x"
    private const val KEY_Y = "overlay-y"

    private fun preferences(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun start(context: Context, snapshotJson: String) {
      val intent = Intent(context, TaxometerTripService::class.java).setAction(ACTION_START).putExtra(EXTRA_SNAPSHOT, snapshotJson)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    fun update(context: Context, snapshotJson: String) {
      val intent = Intent(context, TaxometerTripService::class.java).setAction(ACTION_UPDATE).putExtra(EXTRA_SNAPSHOT, snapshotJson)
      runCatching { context.startService(intent) }
    }

    fun stop(context: Context) {
      runCatching { context.startService(Intent(context, TaxometerTripService::class.java).setAction(ACTION_STOP)) }
      preferences(context).edit().remove(KEY_SNAPSHOT).apply()
    }

    fun isOverlayEnabled(context: Context): Boolean = preferences(context).getBoolean(KEY_OVERLAY_ENABLED, false)

    fun setOverlayEnabled(context: Context, enabled: Boolean) {
      val prefs = preferences(context)
      prefs.edit().putBoolean(KEY_OVERLAY_ENABLED, enabled).apply()
      if (prefs.contains(KEY_SNAPSHOT)) {
        runCatching { context.startService(Intent(context, TaxometerTripService::class.java).setAction(ACTION_REFRESH_OVERLAY)) }
      }
    }
  }
}
