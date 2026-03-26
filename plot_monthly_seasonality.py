import matplotlib.pyplot as plt

from data import df
from estimator import Estimator


def main() -> None:
    estimator = Estimator()
    season_df = estimator.get_seasonal_rate(df)

    if season_df.empty:
        print("계절성 결과가 비어 있습니다. 입력 데이터를 확인하세요.")
        return

    plt.figure(figsize=(9, 4.5))
    plt.plot(
        season_df["month"],
        season_df["seasonal_rate"],
        marker="o",
        linewidth=1.8,
    )
    plt.title("Monthly Seasonal Rate (Month vs Seasonal Rate)")
    plt.xlabel("Month (1~12)")
    plt.ylabel("seasonal_rate")
    plt.xticks(range(1, 13))
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()

