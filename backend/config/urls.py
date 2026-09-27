from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from marketpulse.api import (
    StockViewSet,
    UserStockViewSet,
    add_yahoo_to_watchlist,
    ai_analyze,
    indicator_detail,
    indicator_webhook,
    remove_stock_from_watchlist,
    stock_price_chart,
    yahoo_stock_search,
)

router = DefaultRouter()
router.register("stocks", StockViewSet, basename="stock")
router.register("watchlist", UserStockViewSet, basename="watchlist")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view()),
    path("api/auth/token/refresh/", TokenRefreshView.as_view()),
    path("api/stocks/search/", yahoo_stock_search),
    path("api/watchlist/yahoo/", add_yahoo_to_watchlist),
    path("api/watchlist/stocks/<int:stock_id>/", remove_stock_from_watchlist),
    path("api/stocks/<int:stock_id>/chart/", stock_price_chart),
    path("api/", include(router.urls)),
    path("api/stocks/<int:stock_id>/indicator/", indicator_detail),
    path("api/ai/analyze/", ai_analyze),
    path("api/internal/indicators/", indicator_webhook),
]
