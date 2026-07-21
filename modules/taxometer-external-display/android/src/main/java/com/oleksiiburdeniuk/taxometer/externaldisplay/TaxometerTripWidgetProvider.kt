package com.oleksiiburdeniuk.taxometer.externaldisplay

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

private data class HomeWidgetSnapshot(val json: JSONObject) {
  val status: String = json.optString("status", "active")
  val amountText: String = json.optString("amountText", "—")
  val distanceText: String = json.optString("distanceText", "—")
  val durationText: String = json.optString("durationText", "00:00:00")
  val tariffName: String = json.optString("tariffName", "—")
  val startedAtMs: Long = json.optLong("startedAtMs")
  val pausedAtMs: Long? = json.optLong("pausedAtMs").takeIf { json.has("pausedAtMs") && it > 0 }
  val openUrl: String = json.optString("openUrl", "taxometer://active-trip")
  val controlUrl: String = json.optString("controlUrl", openUrl)
  private val labels = json.optJSONObject("labels") ?: JSONObject()

  fun label(key: String, fallback: String): String = labels.optString(key, fallback)

  fun elapsedMillis(now: Long = System.currentTimeMillis()): Long {
    if (startedAtMs <= 0) return parseDuration(durationText)
    val end = if (status == "paused") pausedAtMs ?: now else now
    return (end - startedAtMs).coerceAtLeast(0)
  }

  private fun parseDuration(value: String): Long {
    val parts = value.split(':').mapNotNull { it.toLongOrNull() }
    if (parts.size != 3) return 0
    return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000
  }
}

private data class HomeWidgetIdle(
  val appName: String,
  val title: String,
  val hint: String,
  val open: String,
  val openUrl: String,
)

class TaxometerTripWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { updateWidget(context, manager, it) }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    updateWidget(context, manager, appWidgetId)
  }

  companion object {
    private const val SMALL_MAX_WIDTH_DP = 210
    private const val LARGE_MIN_HEIGHT_DP = 210
    private const val MIN_UPDATE_INTERVAL_MS = 5_000L
    private var lastUpdateAt = 0L
    private var lastStateFingerprint = ""

    fun updateAll(context: Context, force: Boolean = false) {
      val now = System.currentTimeMillis()
      val fingerprint = TaxometerTripService.savedSnapshot(context)
        ?.let { raw ->
          runCatching {
            val json = JSONObject(raw)
            listOf(json.optString("tripId"), json.optString("status"), json.optString("tariffName")).joinToString("|")
          }.getOrNull()
        } ?: "idle"
      val priorityChange = fingerprint != lastStateFingerprint
      if (!force && !priorityChange && now - lastUpdateAt < MIN_UPDATE_INTERVAL_MS) return
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, TaxometerTripWidgetProvider::class.java)
      manager.getAppWidgetIds(component).forEach { updateWidget(context, manager, it) }
      lastUpdateAt = now
      lastStateFingerprint = fingerprint
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val options = manager.getAppWidgetOptions(appWidgetId)
      val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
      val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
      val family = when {
        minWidth >= SMALL_MAX_WIDTH_DP && minHeight >= LARGE_MIN_HEIGHT_DP -> WidgetFamily.LARGE
        minWidth >= SMALL_MAX_WIDTH_DP -> WidgetFamily.MEDIUM
        else -> WidgetFamily.SMALL
      }
      val layout = when (family) {
        WidgetFamily.SMALL -> R.layout.taxometer_trip_widget_small
        WidgetFamily.MEDIUM -> R.layout.taxometer_trip_widget_medium
        WidgetFamily.LARGE -> R.layout.taxometer_trip_widget_large
      }
      val views = RemoteViews(context.packageName, layout)
      val snapshot = TaxometerTripService.savedSnapshot(context)
        ?.let { runCatching { HomeWidgetSnapshot(JSONObject(it)) }.getOrNull() }
      if (snapshot == null) renderIdle(context, views, family, appWidgetId)
      else renderActive(context, views, family, appWidgetId, snapshot)
      manager.updateAppWidget(appWidgetId, views)
    }

    private fun renderActive(
      context: Context,
      views: RemoteViews,
      family: WidgetFamily,
      appWidgetId: Int,
      item: HomeWidgetSnapshot,
    ) {
      views.setViewVisibility(R.id.widget_active_content, View.VISIBLE)
      views.setViewVisibility(R.id.widget_idle_content, View.GONE)
      val paused = item.status == "paused"
      val status = if (paused) item.label("pausedShort", item.label("paused", "Paused"))
      else item.label("activeShort", item.label("active", "Active"))
      views.setTextViewText(R.id.widget_status, status)
      views.setTextColor(R.id.widget_status, Color.parseColor(if (paused) "#A9ADB4" else "#38C989"))
      views.setTextViewText(R.id.widget_amount, item.amountText)
      views.setTextViewText(R.id.widget_distance, item.distanceText)
      val base = SystemClock.elapsedRealtime() - item.elapsedMillis()
      views.setChronometer(R.id.widget_time, base, null, !paused)
      views.setOnClickPendingIntent(
        R.id.widget_root,
        activityPendingIntent(context, item.openUrl, appWidgetId * 10 + 1),
      )
      if (family != WidgetFamily.SMALL) {
        views.setTextViewText(R.id.widget_tariff, item.tariffName)
        views.setTextViewText(R.id.widget_time_label, item.label("time", "Time").uppercase())
        views.setTextViewText(R.id.widget_distance_label, item.label("distance", "Distance").uppercase())
        views.setTextViewText(R.id.widget_tariff_label, item.label("tariff", "Tariff").uppercase())
        val control = if (paused) {
          "▶  ${item.label("resume", "Resume")}"
        } else {
          "Ⅱ  ${item.label("pause", "Pause")}"
        }
        views.setTextViewText(R.id.widget_control, control)
        views.setOnClickPendingIntent(
          R.id.widget_control,
          activityPendingIntent(context, item.controlUrl, appWidgetId * 10 + 2),
        )
      }
      if (family == WidgetFamily.LARGE) {
        views.setTextViewText(R.id.widget_open, item.label("open", "Open"))
        views.setOnClickPendingIntent(
          R.id.widget_open,
          activityPendingIntent(context, item.openUrl, appWidgetId * 10 + 3),
        )
      }
    }

    private fun renderIdle(context: Context, views: RemoteViews, family: WidgetFamily, appWidgetId: Int) {
      views.setViewVisibility(R.id.widget_active_content, View.GONE)
      views.setViewVisibility(R.id.widget_idle_content, View.VISIBLE)
      val idle = readIdle(context)
      views.setTextViewText(R.id.widget_idle_app_name, idle.appName)
      views.setTextViewText(R.id.widget_idle_title, idle.title)
      views.setTextViewText(R.id.widget_idle_hint, idle.hint)
      if (family != WidgetFamily.SMALL) views.setTextViewText(R.id.widget_idle_open, idle.open)
      views.setOnClickPendingIntent(
        R.id.widget_root,
        activityPendingIntent(context, idle.openUrl, appWidgetId * 10 + 4),
      )
    }

    private fun readIdle(context: Context): HomeWidgetIdle {
      val json = TaxometerTripService.savedWidgetIdle(context)
        ?.let { runCatching { JSONObject(it) }.getOrNull() }
      val copy = json?.optJSONObject("idle")
      return HomeWidgetIdle(
        appName = copy?.optString("appName", "Taxometer") ?: "Taxometer",
        title = copy?.optString("title", "Ready for a new trip") ?: "Ready for a new trip",
        hint = copy?.optString("hint", "Open the app to start") ?: "Open the app to start",
        open = copy?.optString("open", "Open app") ?: "Open app",
        openUrl = json?.optString("openUrl", "taxometer://") ?: "taxometer://",
      )
    }

    private fun activityPendingIntent(context: Context, url: String, requestCode: Int): PendingIntent {
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_VIEW)
      intent.action = Intent.ACTION_VIEW
      intent.data = Uri.parse(url)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}

private enum class WidgetFamily { SMALL, MEDIUM, LARGE }
