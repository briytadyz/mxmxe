import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type RewardsBalance = {
  organizationId: string;
  availablePoints: number;
} | null;

type RewardsPointsContextValue = {
  rewardsBalance: RewardsBalance;
  setRewardsBalance: Dispatch<SetStateAction<RewardsBalance>>;
};

const RewardsPointsContext = createContext<RewardsPointsContextValue | null>(null);

export const RewardsPointsProvider = ({ children }: { children: ReactNode }) => {
  const [rewardsBalance, setRewardsBalance] = useState<RewardsBalance>(null);

  return (
    <RewardsPointsContext.Provider value={{ rewardsBalance, setRewardsBalance }}>
      {children}
    </RewardsPointsContext.Provider>
  );
};

export const useRewardsPoints = () => {
  const context = useContext(RewardsPointsContext);
  if (!context) throw new Error("useRewardsPoints must be used within RewardsPointsProvider");
  return context;
};
