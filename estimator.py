########################################### 
# Module name : Estimator
# Module functions : Estimator class
# Written by : Yun Dae-young 
# Created at : 2026.03.26 
# Updated at : 2026.03.26 
# Supported by : ChatGPT-4o 
# Note : 
###########################################
import pandas as pd


class Estimator:
    # 현
    def __init__(self, df_original: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity"):
        self.df_monthly_grouped: pd.DataFrame = self._build_monthly_grouped(df_original, col_ym, col_qty)
        self.df_monthly_grid: pd.DataFrame = self._build_monthly_grid(self.df_monthly_grouped, col_ym, col_qty)
        self._seasonal_rate: pd.Series = self._get_seasonal_rate(self.df_monthly_grid, col_ym, col_qty)
        self._assumed_grid: pd.DataFrame = self._assumed_grid(col_ym, col_qty)
        self._df_yearly_quantities: pd.DataFrame = self._build_yearly_quantities(self._assumed_grid, col_ym, col_qty)

    



    @staticmethod
    def add_ema(df: pd.DataFrame, col_qty: str = "quantity", span: int = 10) -> pd.DataFrame:
        """정렬 가정"""
        df_result: pd.DataFrame = df.copy()
        df_result['ema'] = df_result[col_qty].ewm(span=span).mean()
        return df_result


    @staticmethod
    def _build_yearly_quantities(df: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        return df.groupby(col_ym.dt.year, as_index=False)[col_qty].sum()


    def _assumed_grid(self, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        '''데이터 외삽'''
        df_grid: pd.DataFrame = self.df_monthly_grid.copy()
        if df_grid.empty:
            self._assumed_grid = df_grid
            return

        ym_first: pd.Period = df_grid[col_ym].iloc[0]
        ym_last: pd.Period = df_grid[col_ym].iloc[-1]
        start_year: int = int(ym_first.year)
        end_year: int = int(ym_last.year)

        df_start_year: pd.DataFrame = df_grid[df_grid[col_ym].dt.year == start_year].copy()
        df_end_year: pd.DataFrame = df_grid[df_grid[col_ym].dt.year == end_year].copy()

        filled_start = self.__fill_year(start_year, df_start_year)
        filled_end = self.__fill_year(end_year, df_end_year) if end_year != start_year else pd.DataFrame(columns=filled_start.columns)

        if end_year - start_year >= 2:
            middle = df_grid[(df_grid[col_ym].dt.year > start_year) & (df_grid[col_ym].dt.year < end_year)].copy()
        else:
            middle = pd.DataFrame(columns=filled_start.columns)

        expanded = pd.concat([filled_start, middle, filled_end], ignore_index=True)
        expanded = expanded.sort_values(col_ym).reset_index(drop=True)
        return expanded


    def __fill_year(self, year: int, df: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.DataFrame:
        """
        year의 관측 월 합을 기준으로 계절성 비율을 스케일해서 1~12월을 채운다.
        scale = 관측합 / (관측월 seasonal_rate 합)
        예측월수량 = seasonal_rate(month) * scale
        관측된 월은 원본 값을 우선 사용
        """
        ym_s: pd.Period = pd.Period(f"{year}-01", freq="M")
        ym_e: pd.Period = pd.Period(f"{year}-12", freq="M")

        base: pd.DataFrame = df
        full: pd.DataFrame = self._build_grid(base, ym_s, ym_e, col_ym, col_qty)
        full["month"]: pd.Series = full[col_ym].dt.month

        original_months: pd.Series = base[col_ym].dt.month
        original_sum: float = float(base[col_qty].sum())
        original_rate_sum: float = float(self._seasonal_rate.loc[original_months].sum())
        scale: float = 0.0 if original_rate_sum == 0.0 else (original_sum / original_rate_sum)

        assuming = full["month"].map(self._seasonal_rate).astype(float) * scale
        full[col_qty] = full[col_qty].fillna(assuming)
        full.drop(columns=["month"], inplace=True)
        return full


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
    def _get_seasonal_rate(df_grid: pd.DataFrame, col_ym: str = "year_month", col_qty: str = "quantity") -> pd.Series:
        df: pd.DataFrame = df_grid[[col_ym, col_qty]].copy()

        df["year"] = df[col_ym].dt.year
        df["month"] = df[col_ym].dt.month  # 1~12

        # 연도별 총 판매량 -> 해당 월 비중(정규화)
        total_quantity = df.groupby("year")[col_qty].transform("sum")
        df["normalized"] = df[col_qty] / total_quantity.replace(0, pd.NA)

        # 동월 비율 평균(= 해당 month-of-year의 normalized 평균)
        monthly_normalized_mean = df.groupby("month")["normalized"].mean().reindex(range(1, 13))
        return monthly_normalized_mean


if __name__ == "__main__":
    from data import df
    estimator = Estimator(df)
    print(estimator.df_monthly_seasonal_rate)