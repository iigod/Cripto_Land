// Игровые данные
class GameState {
    constructor() {
        this.energy = 100;
        this.maxEnergy = 100;
        this.chips = 100;
        this.crystals = 10;
        this.data = 0;
        
        this.buildings = {
            mine: { level: 1, income: 2 },
            lab: { level: 1, income: 0.1 },
            energy: { level: 1, income: 0.2 }
        };
        
        this.referrals = 0;
        this.lastPlay = Date.now();
        this.lastEnergyUpdate = Date.now();
        
        // Ежедневные награды
        this.dailyStreak = 0;
        this.lastDailyClaim = null;
        this.claimedDays = [];
        
        this.loadGame();
        this.startPassiveIncome();
    }
    
    // Загрузка игры из localStorage
    loadGame() {
        const saved = localStorage.getItem('cryptoEmpireSave');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
            
            // Восстановление времени
            const timePassed = Date.now() - this.lastPlay;
            const energyGained = Math.min(
                (timePassed / 60000) * (1 + this.buildings.energy.income),
                this.maxEnergy - this.energy
            );
            
            this.energy += energyGained;
            this.lastEnergyUpdate = Date.now();
            this.updateUI();
        }
        
        this.checkDailyReward();
    }
    
    // Сохранение игры
    saveGame() {
        this.lastPlay = Date.now();
        localStorage.setItem('cryptoEmpireSave', JSON.stringify(this));
    }
    
    // Пассивный доход
    startPassiveIncome() {
        setInterval(() => {
            const now = Date.now();
            const minutesPassed = (now - this.lastEnergyUpdate) / 60000;
            
            if (minutesPassed >= 1) {
                const energyGain = minutesPassed * (1 + this.buildings.energy.income);
                this.energy = Math.min(this.energy + energyGain, this.maxEnergy);
                this.lastEnergyUpdate = now;
                this.updateUI();
                this.saveGame();
            }
        }, 10000); // Проверка каждые 10 секунд
    }
    
    // Сбор ресурсов
    collectResources() {
        if (this.energy >= 10) {
            this.energy -= 10;
            const baseGain = 15;
            const mineBonus = this.buildings.mine.level * 3;
            const referralBonus = 1 + (this.referrals * 0.1); // +10% за каждого реферала
            
            const chipsGained = Math.floor((baseGain + mineBonus) * referralBonus);
            this.chips += chipsGained;
            
            // Шанс получить кристалл
            if (Math.random() < 0.15) {
                this.crystals += 1;
                this.showNotification(`🎉 Найден кристалл! +1🔮`);
            }
            
            this.showNotification(`✅ Собрано ${chipsGained} чипов!`);
            this.updateUI();
            this.saveGame();
        } else {
            this.showNotification('❌ Недостаточно энергии!', true);
            document.getElementById('collect-btn').classList.add('insufficient');
            setTimeout(() => {
                document.getElementById('collect-btn').classList.remove('insufficient');
            }, 500);
        }
    }
    
    // Улучшение зданий
    upgradeBuilding(type) {
        const building = this.buildings[type];
        const cost = building.level * 50;
        
        if (this.chips >= cost) {
            this.chips -= cost;
            building.level++;
            
            // Обновляем доход
            switch(type) {
                case 'mine':
                    building.income = building.level * 2;
                    break;
                case 'lab':
                    building.income = building.level * 0.1;
                    break;
                case 'energy':
                    building.income = building.level * 0.2;
                    break;
            }
            
            this.showNotification(`⚡ ${this.getBuildingName(type)} улучшено до уровня ${building.level}!`);
            this.updateUI();
            this.saveGame();
        } else {
            this.showNotification('❌ Недостаточно чипов!', true);
        }
    }
    
    // Получение имени здания
    getBuildingName(type) {
        const names = {
            mine: 'Шахта',
            lab: 'Лаборатория',
            energy: 'Энергостанция'
        };
        return names[type];
    }
    
    // Ежедневные награды
    checkDailyReward() {
        const today = new Date().toDateString();
        if (this.lastDailyClaim !== today) {
            document.getElementById('daily-btn').disabled = false;
            
            // Сброс серии если пропустили день
            if (this.lastDailyClaim) {
                const lastClaim = new Date(this.lastDailyClaim);
                const daysSinceLastClaim = Math.floor((new Date() - lastClaim) / (1000 * 60 * 60 * 24));
                if (daysSinceLastClaim > 1) {
                    this.dailyStreak = 0;
                    this.claimedDays = [];
                }
            }
            
            this.updateDailyRewardsUI();
        } else {
            document.getElementById('daily-btn').disabled = true;
        }
    }
    
    claimDailyReward() {
        const today = new Date().toDateString();
        if (this.lastDailyClaim !== today) {
            this.lastDailyClaim = today;
            this.dailyStreak++;
            
            const dayIndex = (this.dailyStreak - 1) % 7;
            this.claimedDays.push(dayIndex);
            
            // Награда в зависимости от дня серии
            const rewards = [
                { chips: 50, crystals: 1 },
                { chips: 75, crystals: 1 },
                { chips: 100, crystals: 2 },
                { chips: 150, crystals: 2 },
                { chips: 200, crystals: 3 },
                { chips: 300, crystals: 3 },
                { chips: 500, crystals: 5 }
            ];
            
            const reward = rewards[dayIndex];
            this.chips += reward.chips;
            this.crystals += reward.crystals;
            
            this.showNotification(`🎁 Ежедневная награда: ${reward.chips}💿 + ${reward.crystals}🔮`);
            this.updateUI();
            this.updateDailyRewardsUI();
            this.saveGame();
            
            document.getElementById('daily-btn').disabled = true;
        }
    }
    
    // Партнерская программа
    generateReferralLink() {
        const baseUrl = window.location.href.split('?')[0];
        return `${baseUrl}?ref=${btoa('user_' + Date.now()).slice(0, 8)}`;
    }
    
    copyReferralLink() {
        const linkInput = document.getElementById('ref-link');
        linkInput.select();
        document.execCommand('copy');
        this.showNotification('📋 Ссылка скопирована!');
    }
    
    shareGame() {
        if (navigator.share) {
            navigator.share({
                title: 'Crypto Empire - Город Будущего',
                text: 'Присоединяйся к игре и развивай свой город будущего!',
                url: window.location.href
            });
        } else {
            this.copyReferralLink();
        }
    }
    
    // Обновление интерфейса
    updateUI() {
        // Ресурсы
        document.getElementById('energy').textContent = Math.floor(this.energy);
        document.getElementById('chips').textContent = Math.floor(this.chips);
        document.getElementById('crystals').textContent = this.crystals;
        document.getElementById('data').textContent = this.data.toFixed(1);
        
        // Полоска энергии
        const energyPercent = (this.energy / this.maxEnergy) * 100;
        document.getElementById('energy-bar').style.width = energyPercent + '%';
        
        // Здания
        Object.keys(this.buildings).forEach(type => {
            const building = this.buildings[type];
            document.getElementById(`${type}-level`).textContent = building.level;
            document.getElementById(`${type}-income`).textContent = building.income;
            document.getElementById(`${type}-cost`).textContent = building.level * 50;
        });
        
        // Партнеры
        document.getElementById('referral-count').textContent = this.referrals;
        document.getElementById('referral-bonus').textContent = (this.referrals * 10) + '%';
        document.getElementById('ref-link').value = this.generateReferralLink();
        
        // Кнопка сбора
        document.getElementById('collect-btn').disabled = this.energy < 10;
    }
    
    updateDailyRewardsUI() {
        for (let i = 0; i < 7; i++) {
            const dayElement = document.getElementById(`day${i + 1}`);
            dayElement.classList.remove('claimed', 'current');
            
            if (this.claimedDays.includes(i)) {
                dayElement.classList.add('claimed');
            } else if (i === (this.dailyStreak % 7)) {
                dayElement.classList.add('current');
            }
        }
        
        document.getElementById('streak').textContent = this.dailyStreak;
    }
    
    // Уведомления
    showNotification(message, isError = false) {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        text.textContent = message;
        notification.className = isError ? 'notification error' : 'notification';
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Инициализация игры
const game = new GameState();

// Глобальные функции для HTML
function collectResources() {
    game.collectResources();
}

function upgradeBuilding(type) {
    game.upgradeBuilding(type);
}

function claimDailyReward() {
    game.claimDailyReward();
}

function copyReferralLink() {
    game.copyReferralLink();
}

function shareGame() {
    game.shareGame();
}

// Обработка реферальных ссылок при загрузке
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
        // Симуляция добавления реферала
        if (Math.random() < 0.3) { // 30% шанс что реферал зарегистрируется
            setTimeout(() => {
                game.referrals++;
                game.showNotification('🎉 Новый партнер присоединился по вашей ссылке!');
                game.updateUI();
                game.saveGame();
            }, 2000);
        }
    }
    
    // Первоначальное обновление UI
    game.updateUI();
});

// Сохранение при закрытии страницы
window.addEventListener('beforeunload', () => {
    game.saveGame();
});