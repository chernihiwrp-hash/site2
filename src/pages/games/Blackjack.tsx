import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";

const getCard = () => {
  const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
  return cards[Math.floor(Math.random() * cards.length)];
};

const sum = (cards: number[]) => {
  let total = cards.reduce((a, b) => a + b, 0);
  let aces = cards.filter(c => c === 11).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};

const Blackjack = () => {
  const [playerCards, setPlayerCards] = useState<number[]>([]);
  const [dealerCards, setDealerCards] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(true);
  const [bet] = useState(200);

  const deal = () => {
    const p = [getCard(), getCard()];
    const d = [getCard(), getCard()];
    setPlayerCards(p);
    setDealerCards(d);
    setGameOver(false);
    if (sum(p) === 21) {
      toast.success(`Блекджек! Виграш: ${bet * 2.5} CR!`);
      setGameOver(true);
    }
  };

  const hit = () => {
    const newCards = [...playerCards, getCard()];
    setPlayerCards(newCards);
    if (sum(newCards) > 21) {
      toast.error(`Перебор! ${sum(newCards)} очок. Програш: -${bet} CR`);
      setGameOver(true);
    }
  };

  const stand = () => {
    let dc = [...dealerCards];
    while (sum(dc) < 17) dc.push(getCard());
    setDealerCards(dc);
    const ps = sum(playerCards);
    const ds = sum(dc);
    setGameOver(true);
    if (ds > 21 || ps > ds) toast.success(`Виграш! Ви: ${ps}, Дилер: ${ds}. +${bet * 2} CR`);
    else if (ps === ds) toast.info(`Нічия! ${ps} = ${ds}`);
    else toast.error(`Програш. Ви: ${ps}, Дилер: ${ds}. -${bet} CR`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-4">
      <PageHeader title="БЛЕКДЖЕК" subtitle="Класика" backTo="/casino" />

      <div className="animate-fade-in space-y-4">
        {playerCards.length > 0 && (
          <>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-2">Дилер ({gameOver ? sum(dealerCards) : "?"})</p>
              <div className="flex gap-2">
                {dealerCards.map((c, i) => (
                  <div key={i} className="w-12 h-16 rounded-lg glass border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {gameOver || i === 0 ? c : "?"}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-2">Ви ({sum(playerCards)})</p>
              <div className="flex gap-2">
                {playerCards.map((c, i) => (
                  <div key={i} className="w-12 h-16 rounded-lg glass border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {gameOver ? (
          <GradientButton variant="green" className="w-full" onClick={deal}>
            Роздати — {bet} CR
          </GradientButton>
        ) : (
          <div className="flex gap-3">
            <GradientButton variant="green" className="flex-1" onClick={hit}>
              Ще карту
            </GradientButton>
            <GradientButton variant="cyan" className="flex-1" onClick={stand}>
              Стоп
            </GradientButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blackjack;
