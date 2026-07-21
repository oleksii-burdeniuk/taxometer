package com.oleksiiburdeniuk.taxometer.externaldisplay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TaxometerExternalDisplayModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TaxometerExternalDisplay")

    AsyncFunction("startAsync") { snapshotJson: String ->
      val context = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
      TaxometerTripService.start(context, snapshotJson)
    }

    AsyncFunction("updateAsync") { snapshotJson: String ->
      val context = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
      TaxometerTripService.update(context, snapshotJson)
    }

    AsyncFunction("stopAsync") { idleJson: String? ->
      val context = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
      TaxometerTripService.stop(context, idleJson)
    }

    AsyncFunction("canDrawOverlaysAsync") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) true
      else Settings.canDrawOverlays(requireNotNull(appContext.reactContext) { "Android context is unavailable" })
    }

    AsyncFunction("requestOverlayPermissionAsync") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val activity = requireNotNull(appContext.currentActivity) { "A visible activity is required" }
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${activity.packageName}")
        )
        activity.startActivity(intent)
      }
      true
    }

    AsyncFunction("isOverlayEnabledAsync") {
      val context = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
      TaxometerTripService.isOverlayEnabled(context)
    }

    AsyncFunction("setOverlayEnabledAsync") { enabled: Boolean ->
      val context = requireNotNull(appContext.reactContext) { "Android context is unavailable" }
      TaxometerTripService.setOverlayEnabled(context, enabled)
    }
  }
}
