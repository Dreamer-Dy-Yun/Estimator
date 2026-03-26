import pandas as pd


class Estimator:
    def __init__(self, df_original: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity"):
        self.df_monthly_grouped: pd.DataFrame = self._build_monthly_grouped(df_original, col_ym, col_qty)
        self.df_monthly_grid: pd.DataFrame = self._build_monthly_grid(self.df_monthly_grouped, col_ym, col_qty)
        self.df_monthly_seasonal_rate: pd.DataFrame = self._get_seasonal_rate(self.df_monthly_grid, col_ym, col_qty)
        self.expended_grid: pd.DataFrame = pd.DataFrame()


    def _expand_grid(self, col_ym: str = "year_month", col_qty: str = "quantity") -> None:
        '''데이터 외삽'''
        df_grid: pd.DataFrame = self.df_monthly_grid.copy()
        if df_grid.empty:
            self.expended_grid = df_grid
            return

        # month별 계절성 비율(share): index=1..12
        seasonal = (
            self.df_monthly_seasonal_rate.set_index("month")["seasonal_rate"]
            .reindex(range(1, 13))
            .fillna(0.0)
        )

        ym_first: pd.Period = df_grid[col_ym].iloc[0]
        ym_last: pd.Period = df_grid[col_ym].iloc[-1]
        start_year = int(ym_first.year)
        end_year = int(ym_last.year)

        def _fill_year(year: int, year_df: pd.DataFrame) -> pd.DataFrame:
            """
            year의 관측 월 합을 기준으로 계절성 비율을 스케일해서 1~12월을 채운다.
            scale = 관측합 / (관측월 seasonal_rate 합)
            예측월수량 = seasonal_rate(month) * scale
            관측된 월은 원본 값을 우선 사용
            """
            ym_s = pd.Period(f"{year}-01", freq="M")
            ym_e = pd.Period(f"{year}-12", freq="M")

            base = year_df[[col_ym, col_qty]].copy()
            base[col_qty] = pd.to_numeric(base[col_qty], errors="coerce").fillna(0.0)

            full = Estimator._build_grid(base, ym_s, ym_e, col_ym, col_qty)
            full[col_qty] = pd.to_numeric(full[col_qty], errors="coerce")
            full["month"] = full[col_ym].dt.month

            obs_months = base[col_ym].dt.month
            obs_sum = float(base[col_qty].sum())
            share_obs_sum = float(seasonal.loc[obs_months].sum())
            scale = 0.0 if share_obs_sum == 0.0 else (obs_sum / share_obs_sum)

            pred = full["month"].map(seasonal).astype(float) * scale
            full[col_qty] = full[col_qty].fillna(pred)
            full.drop(columns=["month"], inplace=True)
            return full

        df_start_year = df_grid[df_grid[col_ym].dt.year == start_year].copy()
        df_end_year = df_grid[df_grid[col_ym].dt.year == end_year].copy()

        filled_start = _fill_year(start_year, df_start_year)
        filled_end = _fill_year(end_year, df_end_year) if end_year != start_year else pd.DataFrame(columns=filled_start.columns)

        if end_year - start_year >= 2:
            middle = df_grid[(df_grid[col_ym].dt.year > start_year) & (df_grid[col_ym].dt.year < end_year)].copy()
        else:
            middle = pd.DataFrame(columns=filled_start.columns)

        expanded = pd.concat([filled_start, middle, filled_end], ignore_index=True)
        expanded = expanded.sort_values(col_ym).reset_index(drop=True)
        self.expended_grid = expanded


    @staticmethod
    def _build_grid(df: pd.DataFrame, ym_start: pd.Period, ym_end: pd.Period, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        df_grid : pd.DataFrame = pd.DataFrame({col_ym: pd.period_range(start=ym_start, end=ym_end, freq="M")})
        df_grid = df_grid.merge(df, on=col_ym, how="left")
        return df_grid


    @staticmethod
    def _build_monthly_grouped(df_data: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        if df_data.empty:
            raise ValueError("No data provided.")

        df : pd.DataFrame = df_data[[col_ym, col_qty]].copy()
        df[col_qty] : pd.Series = pd.to_numeric(df[col_qty], errors="coerce").fillna(0)
        return df.groupby(col_ym, as_index=False)[col_qty].sum().sort_values(col_ym, ascending=True)


    @staticmethod
    def _build_monthly_grid(df_monthly_groupped: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        pos : pd.Series = df_monthly_groupped[col_qty] > 0
        
        if not pos.any():
            return pd.DataFrame({"year_month": list(range(1, 13)), "quantity": [0.0] * 12,})

        ym_start : pd.Period = df_monthly_groupped.loc[pos, col_ym].iloc[0]
        ym_end : pd.Period = df_monthly_groupped.loc[pos, col_ym].iloc[-1]

        # 시작~종료 사이의 모든 월 그리드 생성(없는 월은 0)
        df_grid : pd.DataFrame = Estimator._build_grid(df_monthly_groupped, ym_start, ym_end, col_ym, col_qty).fillna(0)
        return df_grid


    @staticmethod
    def _get_seasonal_rate(df_grid: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        df: pd.DataFrame = df_grid[[col_ym, col_qty]].copy()

        df["year"] = df[col_ym].dt.year
        df["month"] = df[col_ym].dt.month  # 1~12

        # 연도별 총 판매량 -> 해당 월 비중(정규화)
        total_quantity = df.groupby("year")[col_qty].transform("sum")
        df["normalized"] = df[col_qty] / total_quantity.replace(0, pd.NA)

        # 동월 비율 평균(= 해당 month-of-year의 normalized 평균)
        monthly_normalized_mean = df.groupby("month")["normalized"].mean().reindex(range(1, 13))
        return pd.DataFrame({
            "month": list(monthly_normalized_mean.index.astype(int)),
            "seasonal_rate": monthly_normalized_mean.values,
        })


if __name__ == "__main__":
    from data import df
    estimator = Estimator(df)
    print(estimator.df_monthly_seasonal_rate)