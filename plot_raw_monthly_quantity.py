from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.optimize import curve_fit  # type: ignore

from data import df


def to_timestamp_month(series: pd.Series) -> pd.Series:
    """
    year_month가 Period[M]면 월 시작 Timestamp로 바꿔서 x축으로 쓰기 쉽게 만든다.
    """
    if isinstance(getattr(series, "dtype", None), pd.PeriodDtype):
        return series.dt.to_timestamp()
    # datetime/string으로 들어와도 최소한 월 기준 정규화
    return pd.to_datetime(series, errors="coerce").dt.to_period("M").dt.to_timestamp()


def main() -> None:
    col_ym = "year_month"
    col_qty = "quantity"

    data = df[[col_ym, col_qty]].copy()
    data = data.sort_values(col_ym).reset_index(drop=True)

    x = to_timestamp_month(data[col_ym])
    y = pd.to_numeric(data[col_qty], errors="coerce").fillna(0)

    # 후보 모델 기반 자동 트렌드라인 선택(선형/다항/로그/지수)
    # t는 월 인덱스(0..N-1). datetime scale은 너무 커져 회귀 안정성이 떨어질 수 있어 제외.
    t = np.arange(len(y), dtype=np.float64)
    y_np = y.to_numpy(dtype=np.float64)

    def rmse(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.sqrt(np.mean((a - b) ** 2)))

    def predict_linear() -> np.ndarray:
        coeff = np.polyfit(t, y_np, deg=1)  # y = a*t + b
        return coeff[0] * t + coeff[1]

    def predict_linear_fit_window(tt: np.ndarray, yy: np.ndarray) -> tuple[np.ndarray, tuple[float, float]]:
        """
        y = m*t + b 를 (tt, yy) 구간으로만 피팅하고,
        전체 t축 예측값과 (m, b)를 반환.
        """
        coeff = np.polyfit(tt, yy, deg=1)
        m, b = float(coeff[0]), float(coeff[1])
        return m * t + b, (m, b)

    def predict_poly(deg: int) -> np.ndarray:
        coeff = np.polyfit(t, y_np, deg=deg)
        return np.polyval(coeff, t)

    def predict_log() -> np.ndarray:
        # y = a*log(t+1) + b
        tt = np.log(t + 1.0)
        coeff = np.polyfit(tt, y_np, deg=1)
        return coeff[0] * tt + coeff[1]

    def predict_exp_fit_window(tt: np.ndarray, yy: np.ndarray) -> tuple[np.ndarray, tuple[float, float, float]]:
        """
        y = A*exp(B*t) + C 를 y-공간 비선형 최소제곱(curve_fit)으로 피팅하고,
        전체 t축에 대한 예측값과 (A,B,C)를 반환.
        """
        def f(t_in: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
            return a * np.exp(b * t_in) + c

        # 초기값 추정(피팅 구간 기반)
        c0 = float(np.min(yy))
        a0 = float(max(np.max(yy) - c0, 1.0))
        b0 = 0.0

        # 과도한 발산 방지용 바운드(필요하면 조정)
        bounds = ([0.0, -5.0, 0.0], [np.inf, 5.0, np.inf])

        popt, _ = curve_fit(
            f,
            tt,
            yy,
            p0=(a0, b0, c0),
            bounds=bounds,
            maxfev=20000,
        )
        a, b, c = float(popt[0]), float(popt[1]), float(popt[2])
        yhat_full = f(t, a, b, c)
        return np.maximum(yhat_full, 0.0), (a, b, c)

    # 지수 추세선 (SciPy curve_fit)
    # 피팅 기준:
    #   y = A*exp(B*t) + C 형태로 두고 y-공간 비선형 최소제곱으로 A,B,C를 추정합니다(curve_fit).
    # 추가로 "판매가 있는 구간(y>0)"만으로 피팅한 버전도 함께 그려 비교합니다.
    if np.allclose(y_np, 0.0):
        trend = np.zeros_like(y_np)
        trend_nz = np.zeros_like(y_np)
        best_rmse = rmse(y_np, trend)
        print("All quantities are 0 -> trend is all_zero")
    else:
        trend, (a_all, b_all, c_all) = predict_exp_fit_window(t, y_np)
        best_rmse = rmse(y_np, trend)

        # 판매가 있는 구간(y>0)만으로 피팅 (시각적으로 더 "트렌드"에 가깝게 보이는 경우가 많음)
        nz = y_np > 0
        if nz.sum() >= 3:
            trend_nz, (a_nz, b_nz, c_nz) = predict_exp_fit_window(t[nz], y_np[nz])
            rmse_nz = rmse(y_np, trend_nz)
        else:
            trend_nz = trend.copy()
            a_nz, b_nz, c_nz = a_all, b_all, c_all
            rmse_nz = best_rmse

        # 선형 추세선(비교용): 전체 / y>0 구간
        lin_all, (m_all, b_all_lin) = predict_linear_fit_window(t, y_np)
        lin_all_rmse = rmse(y_np, lin_all)

        if nz.sum() >= 2:
            lin_nz, (m_nz, b_nz_lin) = predict_linear_fit_window(t[nz], y_np[nz])
            lin_nz_rmse = rmse(y_np, lin_nz)
        else:
            lin_nz = lin_all.copy()
            m_nz, b_nz_lin = m_all, b_all_lin
            lin_nz_rmse = lin_all_rmse

        print("Trend model: exp (SciPy curve_fit)")
        print("Fitting criterion: y-space nonlinear least squares on y = A*exp(B*t) + C")
        print(f"Params (all points): A={a_all:.6f}, B={b_all:.6f}, C={c_all:.6f}, RMSE={best_rmse:.6f}")
        print(f"Params (y>0 only):  A={a_nz:.6f}, B={b_nz:.6f}, C={c_nz:.6f}, RMSE={rmse_nz:.6f}")
        print(f"Linear baseline(all): m={m_all:.6f}, b={b_all_lin:.6f}, RMSE={lin_all_rmse:.6f}")
        print(f"Linear baseline(y>0): m={m_nz:.6f}, b={b_nz_lin:.6f}, RMSE={lin_nz_rmse:.6f}")

    plt.figure(figsize=(10, 4.8))
    plt.plot(x, y, marker="o", linewidth=1.7)
    plt.plot(x, trend, linestyle="--", linewidth=2.0, label=f"Trend exp(all) RMSE={best_rmse:.2f}")
    if not np.allclose(y_np, 0.0):
        plt.plot(x, trend_nz, linestyle="--", linewidth=2.0, label=f"Trend exp(y>0) RMSE={rmse(y_np, trend_nz):.2f}")
        plt.plot(x, lin_all, linestyle=":", linewidth=2.0, label=f"Trend linear(all) RMSE={lin_all_rmse:.2f}")
        plt.plot(x, lin_nz, linestyle=":", linewidth=2.0, label=f"Trend linear(y>0) RMSE={lin_nz_rmse:.2f}")
    plt.title("Raw Monthly Quantity (Original Data)")
    plt.xlabel("Year-Month")
    plt.ylabel("Quantity")
    plt.grid(True, alpha=0.3)
    plt.legend()

    # 보기 좋게 x축 포맷(월 단위)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()

    out_path = Path(__file__).with_name("raw_monthly_quantity.png")
    plt.savefig(out_path, dpi=150)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    main()

