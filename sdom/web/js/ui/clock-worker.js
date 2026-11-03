// Relógio do robô: um tique a cada 20 ms. Fica num Web Worker porque o navegador não pausa
// os tiques de um worker quando a aba sai de foco (pausa só o desenho). Assim o robô continua vivo.
setInterval(()=>postMessage(0), 20);
